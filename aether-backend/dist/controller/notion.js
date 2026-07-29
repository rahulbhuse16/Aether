"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmMeetingActionItems = exports.analyzeMeetingNotes = exports.disconnectNotion = exports.createNotionPage = exports.searchNotion = exports.getNotionPages = exports.syncNotion = exports.getNotionStatus = exports.notionWebhook = exports.notionCallback = exports.connectNotion = void 0;
const client_1 = require("@notionhq/client");
const user_1 = require("../models/user");
const notion_page_1 = require("../models/notion-page");
const notifications_1 = require("../utils/notifications");
const notification_1 = require("../models/notification");
const env_1 = require("../config/env");
const notion_1 = require("../services/notion");
const task_1 = require("../models/task");
const groq_1 = require("../services/groq");
const notion_2 = require("../utils/notion");
const project_1 = require("../models/project");
const { NOTION_CLIENT_ID, NOTION_CLIENT_SECRET, NOTION_REDIRECT_URI, FRONTEND_URL, } = env_1.ENV;
/**
 * ASSUMPTION: auth middleware populates req.user.id (adjust to your
 * actual shape — could be req.user._id, req.userId, a JWT payload, etc.)
 */
function getAuthedUserId(req) {
    return req.query.userId;
}
function extractTitle(page) {
    const props = page.properties || {};
    for (const key of Object.keys(props)) {
        const prop = props[key];
        if (prop.type === "title" && Array.isArray(prop.title) && prop.title.length > 0) {
            return prop.title.map((t) => t.plain_text).join("") || "Untitled";
        }
    }
    return "Untitled";
}
function extractIcon(page) {
    if (!page.icon)
        return null;
    if (page.icon.type === "emoji")
        return page.icon.emoji;
    if (page.icon.type === "file")
        return page.icon.file?.url ?? null;
    if (page.icon.type === "external")
        return page.icon.external?.url ?? null;
    return null;
}
/**
 * Redirects into Notion's OAuth flow. Requires auth middleware — the
 * userId is taken from the authenticated session and encoded into
 * `state`, never accepted as a query param.
 */
const connectNotion = async (req, res) => {
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
    }
    catch (error) {
        console.error("Notion connect error:", error);
        res.status(500).json({ message: "Failed to connect Notion" });
    }
};
exports.connectNotion = connectNotion;
/**
 * OAuth callback — hit directly by Notion's redirect (no auth middleware
 * here, since the browser is mid-redirect and may not carry session
 * state cleanly). Recovers the userId from the signed `state` param
 * instead, same pattern as the existing Google Calendar callback.
 */
const notionCallback = async (req, res) => {
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
        const decoded = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
        const { userId } = decoded;
        if (!userId) {
            res.status(400).send("Invalid state");
            return;
        }
        const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString("base64")}`,
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
        const tokenData = (await tokenRes.json());
        const user = await user_1.User.findByIdAndUpdate(userId, {
            $set: {
                "notion.accessToken": tokenData.access_token,
                "notion.workspaceId": tokenData.workspace_id,
                "notion.workspaceName": tokenData.workspace_name,
                "notion.connected": true,
            },
        }, { new: true });
        if (!user) {
            res.status(404).send("User not found");
            return;
        }
        res.redirect(`${FRONTEND_URL}/notion?notion=connected`);
    }
    catch (error) {
        console.error("Notion callback error:", error);
        res.redirect(`${FRONTEND_URL}/notion?notion=failed`);
    }
};
exports.notionCallback = notionCallback;
/**
 * Notion webhook — handles the one-time verification handshake plus a
 * bare ack for real events. Full event-driven resync (page.updated etc.)
 * depends on your Notion integration's verified webhook payload shape;
 * left minimal on purpose rather than guessing that shape.
 */
const notionWebhook = async (req, res) => {
    try {
        const payload = req.body;
        if (payload?.verification_token) {
            console.log("Notion webhook verification token:", payload.verification_token);
            res.status(200).json({
                success: true,
            });
            return;
        }
        const { type, workspace_id, entity, } = payload;
        const user = await user_1.User.findOne({
            "notion.workspaceId": workspace_id,
            "notion.connected": true,
        });
        if (!user) {
            res.status(200).send("OK");
            return;
        }
        const pageId = entity?.id;
        await (0, notion_1.syncNotionToDB)(user._id.toString(), pageId, type);
        res.status(200).send("OK");
    }
    catch (error) {
        console.error("Notion webhook error:", error);
        res.status(200).send("OK");
    }
};
exports.notionWebhook = notionWebhook;
const getNotionStatus = async (req, res) => {
    try {
        const { userId } = req.query;
        const user = await user_1.User.findById(userId).select("notion");
        res.status(200).json({
            connected: !!user?.notion?.connected,
            workspaceId: user?.notion?.workspaceId ?? null,
            workspaceName: user?.notion?.workspaceName ?? null,
            lastSyncAt: user?.notion?.lastSyncAt ?? null,
        });
    }
    catch (error) {
        console.error("getNotionStatus error:", error);
        res.status(500).json({ message: "Failed to load Notion status" });
    }
};
exports.getNotionStatus = getNotionStatus;
/**
 * Full re-sync: pages through Notion's search API (only way to list
 * "everything shared with the integration" — Notion has no bulk list-all
 * endpoint) and upserts each page, deduped on notionPageId.
 */
const syncNotion = async (req, res) => {
    try {
        const userId = getAuthedUserId(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const user = await user_1.User.findById(userId);
        if (!user?.notion?.connected || !user.notion.accessToken) {
            res.status(400).json({ message: "Notion is not connected for this user" });
            return;
        }
        const notion = new client_1.Client({ auth: user.notion.accessToken });
        let cursor;
        let syncedCount = 0;
        do {
            const response = await notion.search({
                start_cursor: cursor,
                page_size: 50,
                filter: { property: "object", value: "page" },
            });
            for (const result of response.results) {
                if (result.object !== "page")
                    continue;
                await notion_page_1.NotionPage.findOneAndUpdate({ userId, notionPageId: result.id }, {
                    $set: {
                        workspaceId: user.notion.workspaceId,
                        title: extractTitle(result),
                        url: result.url,
                        icon: extractIcon(result),
                        lastEditedTime: new Date(result.last_edited_time),
                        archived: result.archived,
                        syncedAt: new Date(),
                    },
                }, { upsert: true });
                syncedCount++;
            }
            cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
        } while (cursor);
        await user_1.User.findByIdAndUpdate(userId, {
            $set: { "notion.lastSyncAt": new Date() },
        });
        await (0, notifications_1.saveNotification)({
            userId,
            type: notification_1.NotificationType.SYSTEM,
            priority: notification_1.NotificationPriority.LOW,
            title: "Notion sync complete",
            description: `Synced ${syncedCount} page${syncedCount === 1 ? "" : "s"} from Notion.`,
            href: "/notion",
            metadata: { source: "notion", syncedCount },
        });
        res.status(200).json({ success: true, syncedCount });
    }
    catch (error) {
        console.error("syncNotion error:", error);
        res.status(500).json({ message: "Failed to sync Notion pages" });
    }
};
exports.syncNotion = syncNotion;
/**
 * Reads from our own synced DB (fast, paginated) rather than hitting
 * Notion live on every page load.
 */
const getNotionPages = async (req, res) => {
    try {
        const userId = getAuthedUserId(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Number(req.query.limit) || 25);
        const [pages, total] = await Promise.all([
            notion_page_1.NotionPage.find({ userId, archived: false })
                .sort({ lastEditedTime: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            notion_page_1.NotionPage.countDocuments({ userId, archived: false }),
        ]);
        res.status(200).json({ pages, total, page, limit });
    }
    catch (error) {
        console.error("getNotionPages error:", error);
        res.status(500).json({ message: "Failed to load Notion pages" });
    }
};
exports.getNotionPages = getNotionPages;
/**
 * Searches the synced DB by title. This is also what
 * groqService-style "AI knowledge context" lookups should call — cheap,
 * fast, and scoped to relevant pages instead of sending the whole
 * workspace to the model.
 */
const searchNotion = async (req, res) => {
    try {
        const userId = getAuthedUserId(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const q = (req.query.q || "").trim();
        if (!q) {
            res.status(200).json([]);
            return;
        }
        const pages = await notion_page_1.NotionPage.find({
            userId,
            archived: false,
            title: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" },
        })
            .sort({ lastEditedTime: -1 })
            .limit(20);
        res.status(200).json(pages);
    }
    catch (error) {
        console.error("searchNotion error:", error);
        res.status(500).json({ message: "Failed to search Notion pages" });
    }
};
exports.searchNotion = searchNotion;
/**
 * Creates a page in Notion. NOTE: Notion requires a parent page/database
 * the integration was explicitly granted access to — there's no
 * "workspace root." Pass parentPageId explicitly until a default is
 * captured (e.g. during OAuth, or via a Settings picker).
 */
const createNotionPage = async (req, res) => {
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
                message: "parentPageId is required — Notion has no 'workspace root' to create into.",
            });
            return;
        }
        const user = await user_1.User.findById(userId);
        if (!user?.notion?.connected || !user.notion.accessToken) {
            res.status(400).json({ message: "Notion is not connected for this user" });
            return;
        }
        const notion = new client_1.Client({ auth: user.notion.accessToken });
        const created = await notion.pages.create({
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
        const saved = await notion_page_1.NotionPage.findOneAndUpdate({ userId, notionPageId: created.id }, {
            $set: {
                workspaceId: user.notion.workspaceId,
                title,
                url: created.url,
                content,
                lastEditedTime: new Date(),
                archived: false,
                syncedAt: new Date(),
            },
        }, { upsert: true, new: true });
        res.status(201).json(saved);
    }
    catch (error) {
        console.error("createNotionPage error:", error);
        res.status(500).json({ message: "Failed to create Notion page" });
    }
};
exports.createNotionPage = createNotionPage;
const disconnectNotion = async (req, res) => {
    try {
        const userId = getAuthedUserId(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        await user_1.User.findByIdAndUpdate(userId, {
            $set: { "notion.connected": false, "notion.accessToken": "" },
        });
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error("disconnectNotion error:", error);
        res.status(500).json({ message: "Failed to disconnect Notion" });
    }
};
exports.disconnectNotion = disconnectNotion;
/**
 * Extracts structured action items from a synced Notion page's content.
 * Does NOT create any tasks — purely returns candidates for the user to
 * review, edit, deselect, and confirm client-side.
 */
const analyzeMeetingNotes = async (req, res) => {
    try {
        const userId = getAuthedUserId(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const { pageId } = req.params; // notionPageId, not our Mongo _id
        const page = await notion_page_1.NotionPage.findOne({ userId, notionPageId: pageId });
        if (!page) {
            res.status(404).json({ message: "Notion page not found — try syncing first." });
            return;
        }
        let content = page.content;
        // Content might be missing if this page was synced before the
        // content-sync feature existed, or was created via createNotionPage
        // (which doesn't back-fill content). Fetch it on demand rather
        // than forcing a full re-sync.
        if (!content) {
            const user = await user_1.User.findById(userId);
            if (!user?.notion?.connected || !user.notion.accessToken) {
                res.status(400).json({ message: "Notion is not connected for this user" });
                return;
            }
            const notion = new client_1.Client({ auth: user.notion.accessToken });
            content = await (0, notion_2.getPageContentAsText)(notion, pageId);
            await notion_page_1.NotionPage.findByIdAndUpdate(page._id, { $set: { content } });
        }
        if (!content || content.trim().length < 20) {
            res.status(400).json({
                message: "This page doesn't have enough content to extract action items from.",
            });
            return;
        }
        const { items } = await groq_1.groqService.extractActionItemsFromNotes(content);
        res.status(200).json({ pageTitle: page.title, pageUrl: page.url, items });
    }
    catch (error) {
        console.error("analyzeMeetingNotes error:", error);
        res.status(500).json({ message: "Failed to analyze meeting notes" });
    }
};
exports.analyzeMeetingNotes = analyzeMeetingNotes;
/**
 * Creates Aether tasks from user-confirmed action items. The frontend
 * sends back whatever subset of items the user kept/edited — this does
 * NOT re-run extraction, so it trusts the shape but not the source
 * (still validates each item has a title before creating).
 */
const confirmMeetingActionItems = async (req, res) => {
    try {
        const userId = getAuthedUserId(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const { sourcePageId, sourcePageTitle, items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            res.status(400).json({ message: "No action items to create" });
            return;
        }
        const validItems = items.filter((i) => i.title && i.title.trim());
        if (validItems.length === 0) {
            res.status(400).json({ message: "Every action item needs a title" });
            return;
        }
        // Same stopgap as the Slack create_task flow: Task.project is
        // required, but there's still no per-feature way to pick one.
        const defaultProject = await project_1.Project.findOne({ owner: userId }).sort({ createdAt: 1 });
        if (!defaultProject) {
            res.status(400).json({
                message: "You need at least one project before creating tasks from Notion.",
            });
            return;
        }
        const created = await Promise.all(validItems.map((item) => task_1.Task.create({
            id: `notion-${crypto.randomUUID()}`,
            title: item.title.trim(),
            status: "open",
            source: "notion",
            priority: item.priority || "medium",
            dueDate: item.dueDate,
            user: userId,
            project: defaultProject._id,
        })));
        await (0, notifications_1.saveNotification)({
            userId,
            type: notification_1.NotificationType.SYSTEM,
            priority: notification_1.NotificationPriority.LOW,
            title: "Tasks created from Notion meeting notes",
            description: `Created ${created.length} task${created.length === 1 ? "" : "s"} from "${sourcePageTitle ?? "a Notion page"}".`,
            href: "/tasks",
            metadata: { source: "notion", sourcePageId, taskCount: created.length },
        });
        res.status(201).json({ success: true, tasks: created });
    }
    catch (error) {
        console.error("confirmMeetingActionItems error:", error);
        res.status(500).json({ message: "Failed to create tasks from action items" });
    }
};
exports.confirmMeetingActionItems = confirmMeetingActionItems;
