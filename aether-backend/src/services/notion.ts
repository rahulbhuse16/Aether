import { Client } from "@notionhq/client";
import {
    NotificationPriority,
    NotificationType,
} from "../models/notification";
import { User } from "../models/user";
import { saveNotification } from "../utils/notifications";
import { NotionPage } from "../models/notion-page";
import { extractTitle, extractIcon } from "../utils/notion";


export const syncNotionToDB = async (
    userId: string,
    pageId?: string,
    eventType?: string
): Promise<void> => {
    try {
        if (!userId) {
            return;
        }

        const user = await User.findById(userId);

        if (
            !user?.notion?.connected ||
            !user.notion.accessToken
        ) {
            return;
        }

        const notion = new Client({
            auth: user.notion.accessToken,
        });


        /**
         * =========================================
         * WEBHOOK SINGLE PAGE SYNC
         * =========================================
         */

        if (pageId) {

            /**
             * Deleted page
             */
            if (eventType === "page.deleted") {

                await NotionPage.findOneAndUpdate(
                    {
                        userId,
                        notionPageId: pageId,
                    },
                    {
                        $set: {
                            archived: true,
                            syncedAt: new Date(),
                        },
                    }
                );

            } else {

                /**
                 * Fetch updated page
                 */
                const page = await notion.pages.retrieve({
                    page_id: pageId,
                }) as any;

                await NotionPage.findOneAndUpdate(
                    {
                        userId,
                        notionPageId: pageId,
                    },
                    {
                        $set: {
                            workspaceId:
                                user.notion.workspaceId,

                            title: extractTitle(page),

                            url: page.url,

                            icon: extractIcon(page),

                            lastEditedTime: new Date(
                                page.last_edited_time
                            ),

                            archived: page.archived,

                            syncedAt: new Date(),
                        },
                    },
                    {
                        upsert: true,
                    }
                );
            }


            /**
             * Exact notification event
             */
            const notificationMap: Record<
                string,
                {
                    title: string;
                    description: string;
                    priority: NotificationPriority;
                }
            > = {

                "page.created": {
                    title: "New Notion page created",
                    description:
                        "A new page was created in your Notion workspace.",
                    priority: NotificationPriority.LOW,
                },

                "page.content_updated": {
                    title: "Notion page content updated",
                    description:
                        "A Notion page content was updated.",
                    priority: NotificationPriority.LOW,
                },

                "page.properties_updated": {
                    title: "Notion page properties updated",
                    description:
                        "A Notion page property was updated.",
                    priority: NotificationPriority.LOW,
                },

                "page.moved": {
                    title: "Notion page moved",
                    description:
                        "A Notion page was moved.",
                    priority: NotificationPriority.LOW,
                },

                "page.deleted": {
                    title: "Notion page deleted",
                    description:
                        "A Notion page was deleted or archived.",
                    priority: NotificationPriority.MEDIUM,
                },
            };

            const notification =
                notificationMap[eventType || ""] || {
                    title: "Notion workspace updated",
                    description:
                        `A ${eventType} event was received from Notion.`,
                    priority: NotificationPriority.LOW,
                };


            await saveNotification({
                userId,

                type: NotificationType.SYSTEM,

                priority: notification.priority,

                title: notification.title,

                description: notification.description,

                href: `/notion?pageId=${pageId}`,

                metadata: {
                    source: "notion",
                    eventType,
                    pageId,
                    workspaceId:
                        user.notion.workspaceId,
                },
            });


            await User.findByIdAndUpdate(userId, {
                $set: {
                    "notion.lastSyncAt": new Date(),
                },
            });

            return;
        }


        /**
         * =========================================
         * FULL NOTION WORKSPACE SYNC
         * =========================================
         */

        let cursor: string | undefined;
        let syncedCount = 0;

        do {

            const response = await notion.search({
                start_cursor: cursor,
                page_size: 50,
                filter: {
                    property: "object",
                    value: "page",
                },
            });

            for (
                const result of response.results as any[]
            ) {

                if (result.object !== "page") {
                    continue;
                }

                await NotionPage.findOneAndUpdate(
                    {
                        userId,
                        notionPageId: result.id,
                    },
                    {
                        $set: {
                            workspaceId:
                                user.notion.workspaceId,

                            title: extractTitle(result),

                            url: result.url,

                            icon: extractIcon(result),

                            lastEditedTime: new Date(
                                result.last_edited_time
                            ),

                            archived: result.archived,

                            syncedAt: new Date(),
                        },
                    },
                    {
                        upsert: true,
                    }
                );

                syncedCount++;
            }

            cursor = response.has_more
                ? response.next_cursor ?? undefined
                : undefined;

        } while (cursor);


        await User.findByIdAndUpdate(userId, {
            $set: {
                "notion.lastSyncAt": new Date(),
            },
        });


        await saveNotification({
            userId,

            type: NotificationType.SYSTEM,

            priority: NotificationPriority.LOW,

            title: "Notion sync complete",

            description:
                `Synced ${syncedCount} page${
                    syncedCount === 1
                        ? ""
                        : "s"
                } from Notion.`,

            href: "/notion",

            metadata: {
                source: "notion",
                syncedCount,
            },
        });

    } catch (error) {

        console.error(
            "syncNotion error:",
            error
        );
    }
};



const MAX_CONTEXT_PAGES = 3;
const MAX_CHARS_PER_PAGE = 1500;

export interface NotionContextResult {
    pages: { title: string; url: string; excerpt: string }[];
    /** Pre-formatted block ready to drop into a prompt; "" when nothing matched. */
    contextBlock: string;
}

const EMPTY: NotionContextResult = { pages: [], contextBlock: "" };

/**
 * Finds Notion pages relevant to a topic (an issue description, an error
 * message, a repo/feature name, a Slack question — anything free-text)
 * and returns them pre-formatted for injection into an AI prompt.
 *
 * This is intentionally the ONLY thing other AI features need to call.
 * It never throws and never requires the caller to check "is Notion
 * connected?" first — disconnected/no-match/error all just return EMPTY,
 * so existing AI features keep working unchanged when Notion isn't set up.
 */
export async function getRelevantNotionContext(
    userId: string,
    topic: string
): Promise<NotionContextResult> {
    try {
        if (!topic || !topic.trim()) return EMPTY;

        const user = await User.findById(userId).select("notion");
        if (!user?.notion?.connected) return EMPTY;

        const terms = topic
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((t) => t.length > 2)
            .slice(0, 8);

        if (terms.length === 0) return EMPTY;

        const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        const regex = escaped.join("|");

        const matches = await NotionPage.find({
            userId,
            archived: false,
            $or: [
                { title: { $regex: regex, $options: "i" } },
                { content: { $regex: regex, $options: "i" } },
            ],
        })
            .sort({ lastEditedTime: -1 })
            .limit(MAX_CONTEXT_PAGES);

        if (matches.length === 0) return EMPTY;

        const pages = matches.map((p) => ({
            title: p.title,
            url: p.url,
            excerpt: (p.content || "").slice(0, MAX_CHARS_PER_PAGE),
        }));

        const contextBlock = pages
            .map((p) => `--- ${p.title} (${p.url}) ---\n${p.excerpt || "(no content synced)"}`)
            .join("\n\n");

        return { pages, contextBlock };
    } catch (error) {
        console.error("getRelevantNotionContext error:", error);
        return EMPTY;
    }
}