import { Request, Response } from "express";
import { Client } from "@notionhq/client";
import { User } from "../models/user";
import { NotionPage } from "../models/notion-page";
import { saveNotification } from "../utils/notifications";
import { NotificationType, NotificationPriority } from "../models/notification";
import { ENV } from "../config/env";

const {
    NOTION_CLIENT_ID,
    NOTION_CLIENT_SECRET,
    NOTION_REDIRECT_URI,
    FRONTEND_URL,
} = ENV;

/**
 * ASSUMPTION: auth middleware populates req.user.id (adjust to your
 * actual shape — could be req.user._id, req.userId, a JWT payload, etc.)
 */
function getAuthedUserId(req: Request): string | null {
    return req.query.userId as string | null;
}

function extractTitle(page: any): string {
    const props = page.properties || {};
    for (const key of Object.keys(props)) {
        const prop = props[key];
        if (prop.type === "title" && Array.isArray(prop.title) && prop.title.length > 0) {
            return prop.title.map((t: any) => t.plain_text).join("") || "Untitled";
        }
    }
    return "Untitled";
}

function extractIcon(page: any): string | null {
    if (!page.icon) return null;
    if (page.icon.type === "emoji") return page.icon.emoji;
    if (page.icon.type === "file") return page.icon.file?.url ?? null;
    if (page.icon.type === "external") return page.icon.external?.url ?? null;
    return null;
}

/**
 * Redirects into Notion's OAuth flow. Requires auth middleware — the
 * userId is taken from the authenticated session and encoded into
 * `state`, never accepted as a query param.
 */
export const connectNotion = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = getAuthedUserId(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const state = Buffer.from(JSON.stringify({ userId })).toString("base64");

        const authUrl = new URL("https://api.notion.com/v1/oauth/authorize");
        authUrl.searchParams.set("client_id", NOTION_CLIENT_ID);
        authUrl.searchParams.set("redirect_uri", NOTION_REDIRECT_URI);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("owner", "user");
        authUrl.searchParams.set("state", state);

        res.redirect(authUrl.toString());
    } catch (error) {
        console.error("Notion connect error:", error);
        res.status(500).json({ message: "Failed to connect Notion" });
    }
};

/**
 * OAuth callback — hit directly by Notion's redirect (no auth middleware
 * here, since the browser is mid-redirect and may not carry session
 * state cleanly). Recovers the userId from the signed `state` param
 * instead, same pattern as the existing Google Calendar callback.
 */
export const notionCallback = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code, state, error: oauthError } = req.query;

        if (oauthError) {
            res.redirect(`${FRONTEND_URL}/notion?notion=denied`);
            return;
        }

        if (!code || !state) {
            res.status(400).send("Missing OAuth code or state");
            return;
        }

        const decoded = JSON.parse(Buffer.from(state as string, "base64").toString("utf-8"));
        const { userId } = decoded;

        if (!userId) {
            res.status(400).send("Invalid state");
            return;
        }

        const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${Buffer.from(
                    `${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`
                ).toString("base64")}`,
            },
            body: JSON.stringify({
                grant_type: "authorization_code",
                code,
                redirect_uri: NOTION_REDIRECT_URI,
            }),
        });

        if (!tokenRes.ok) {
            console.error("Notion token exchange failed:", await tokenRes.text());
            res.redirect(`${FRONTEND_URL}/notion?notion=failed`);
            return;
        }

        const tokenData = (await tokenRes.json()) as {
            access_token: string;
            workspace_id: string;
            workspace_name?: string;
        };

        const user = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    "notion.accessToken": tokenData.access_token,
                    "notion.workspaceId": tokenData.workspace_id,
                    "notion.workspaceName": tokenData.workspace_name,
                    "notion.connected": true,
                },
            },
            { new: true }
        );

        if (!user) {
            res.status(404).send("User not found");
            return;
        }

        res.redirect(`${FRONTEND_URL}/notion?notion=connected`);
    } catch (error) {
        console.error("Notion callback error:", error);
        res.redirect(`${FRONTEND_URL}/notion?notion=failed`);
    }
};

/**
 * Notion webhook — handles the one-time verification handshake plus a
 * bare ack for real events. Full event-driven resync (page.updated etc.)
 * depends on your Notion integration's verified webhook payload shape;
 * left minimal on purpose rather than guessing that shape.
 */
export const notionWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
        if (req.body?.verification_token) {
            console.log("Notion webhook verification token:", req.body.verification_token);
            res.status(200).json({ challenge: req.body.verification_token });
            return;
        }

        res.status(200).send("OK");
    } catch (error) {
        console.error("Notion webhook error:", error);
        res.status(200).send("OK");
    }
};

export const getNotionStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const {userId} = req.query;
        

        const user = await User.findById(userId).select("notion");

        res.status(200).json({
            connected: !!user?.notion?.connected,
            workspaceId: user?.notion?.workspaceId ?? null,
            workspaceName: (user?.notion as any)?.workspaceName ?? null,
            lastSyncAt: (user?.notion as any)?.lastSyncAt ?? null,
        });
    } catch (error) {
        console.error("getNotionStatus error:", error);
        res.status(500).json({ message: "Failed to load Notion status" });
    }
};

/**
 * Full re-sync: pages through Notion's search API (only way to list
 * "everything shared with the integration" — Notion has no bulk list-all
 * endpoint) and upserts each page, deduped on notionPageId.
 */
export const syncNotion = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = getAuthedUserId(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const user = await User.findById(userId);
        if (!user?.notion?.connected || !user.notion.accessToken) {
            res.status(400).json({ message: "Notion is not connected for this user" });
            return;
        }

        const notion = new Client({ auth: user.notion.accessToken });

        let cursor: string | undefined;
        let syncedCount = 0;

        do {
            const response = await notion.search({
                start_cursor: cursor,
                page_size: 50,
                filter: { property: "object", value: "page" },
            });

            for (const result of response.results as any[]) {
                if (result.object !== "page") continue;

                await NotionPage.findOneAndUpdate(
                    { userId, notionPageId: result.id },
                    {
                        $set: {
                            workspaceId: user.notion.workspaceId,
                            title: extractTitle(result),
                            url: result.url,
                            icon: extractIcon(result),
                            lastEditedTime: new Date(result.last_edited_time),
                            archived: result.archived,
                            syncedAt: new Date(),
                        },
                    },
                    { upsert: true }
                );
                syncedCount++;
            }

            cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
        } while (cursor);

        await User.findByIdAndUpdate(userId, {
            $set: { "notion.lastSyncAt": new Date() },
        });

        await saveNotification({
            userId,
            type: NotificationType.SYSTEM,
            priority: NotificationPriority.LOW,
            title: "Notion sync complete",
            description: `Synced ${syncedCount} page${syncedCount === 1 ? "" : "s"} from Notion.`,
            href: "/notion",
            metadata: { source: "notion", syncedCount },
        });

        res.status(200).json({ success: true, syncedCount });
    } catch (error) {
        console.error("syncNotion error:", error);
        res.status(500).json({ message: "Failed to sync Notion pages" });
    }
};

/**
 * Reads from our own synced DB (fast, paginated) rather than hitting
 * Notion live on every page load.
 */
export const getNotionPages = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = getAuthedUserId(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Number(req.query.limit) || 25);

        const [pages, total] = await Promise.all([
            NotionPage.find({ userId, archived: false })
                .sort({ lastEditedTime: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            NotionPage.countDocuments({ userId, archived: false }),
        ]);

        res.status(200).json({ pages, total, page, limit });
    } catch (error) {
        console.error("getNotionPages error:", error);
        res.status(500).json({ message: "Failed to load Notion pages" });
    }
};

/**
 * Searches the synced DB by title. This is also what
 * groqService-style "AI knowledge context" lookups should call — cheap,
 * fast, and scoped to relevant pages instead of sending the whole
 * workspace to the model.
 */
export const searchNotion = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = getAuthedUserId(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const q = ((req.query.q as string) || "").trim();
        if (!q) {
            res.status(200).json([]);
            return;
        }

        const pages = await NotionPage.find({
            userId,
            archived: false,
            title: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
        })
            .sort({ lastEditedTime: -1 })
            .limit(20);

        res.status(200).json(pages);
    } catch (error) {
        console.error("searchNotion error:", error);
        res.status(500).json({ message: "Failed to search Notion pages" });
    }
};

/**
 * Creates a page in Notion. NOTE: Notion requires a parent page/database
 * the integration was explicitly granted access to — there's no
 * "workspace root." Pass parentPageId explicitly until a default is
 * captured (e.g. during OAuth, or via a Settings picker).
 */
export const createNotionPage = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = getAuthedUserId(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { title, content, parentPageId } = req.body;

        if (!title) {
            res.status(400).json({ message: "title is required" });
            return;
        }

        if (!parentPageId) {
            res.status(400).json({
                message:
                    "parentPageId is required — Notion has no 'workspace root' to create into.",
            });
            return;
        }

        const user = await User.findById(userId);
        if (!user?.notion?.connected || !user.notion.accessToken) {
            res.status(400).json({ message: "Notion is not connected for this user" });
            return;
        }

        const notion = new Client({ auth: user.notion.accessToken });

        const created: any = await notion.pages.create({
            parent: { page_id: parentPageId },
            properties: {
                title: { title: [{ text: { content: title } }] },
            },
            children: content
                ? [
                      {
                          object: "block",
                          type: "paragraph",
                          paragraph: { rich_text: [{ type: "text", text: { content } }] },
                      },
                  ]
                : [],
        });

        const saved = await NotionPage.findOneAndUpdate(
            { userId, notionPageId: created.id },
            {
                $set: {
                    workspaceId: user.notion.workspaceId,
                    title,
                    url: created.url,
                    content,
                    lastEditedTime: new Date(),
                    archived: false,
                    syncedAt: new Date(),
                },
            },
            { upsert: true, new: true }
        );

        res.status(201).json(saved);
    } catch (error) {
        console.error("createNotionPage error:", error);
        res.status(500).json({ message: "Failed to create Notion page" });
    }
};

export const disconnectNotion = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = getAuthedUserId(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        await User.findByIdAndUpdate(userId, {
            $set: { "notion.connected": false, "notion.accessToken": "" },
        });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("disconnectNotion error:", error);
        res.status(500).json({ message: "Failed to disconnect Notion" });
    }
};