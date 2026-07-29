"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncNotionToDB = void 0;
exports.getRelevantNotionContext = getRelevantNotionContext;
const client_1 = require("@notionhq/client");
const notification_1 = require("../models/notification");
const user_1 = require("../models/user");
const notifications_1 = require("../utils/notifications");
const notion_page_1 = require("../models/notion-page");
const notion_1 = require("../utils/notion");
const syncNotionToDB = async (userId, pageId, eventType) => {
    try {
        if (!userId) {
            return;
        }
        const user = await user_1.User.findById(userId);
        if (!user?.notion?.connected ||
            !user.notion.accessToken) {
            return;
        }
        const notion = new client_1.Client({
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
                await notion_page_1.NotionPage.findOneAndUpdate({
                    userId,
                    notionPageId: pageId,
                }, {
                    $set: {
                        archived: true,
                        syncedAt: new Date(),
                    },
                });
            }
            else {
                /**
                 * Fetch updated page
                 */
                const page = await notion.pages.retrieve({
                    page_id: pageId,
                });
                await notion_page_1.NotionPage.findOneAndUpdate({
                    userId,
                    notionPageId: pageId,
                }, {
                    $set: {
                        workspaceId: user.notion.workspaceId,
                        title: (0, notion_1.extractTitle)(page),
                        url: page.url,
                        icon: (0, notion_1.extractIcon)(page),
                        lastEditedTime: new Date(page.last_edited_time),
                        archived: page.archived,
                        syncedAt: new Date(),
                    },
                }, {
                    upsert: true,
                });
            }
            /**
             * Exact notification event
             */
            const notificationMap = {
                "page.created": {
                    title: "New Notion page created",
                    description: "A new page was created in your Notion workspace.",
                    priority: notification_1.NotificationPriority.LOW,
                },
                "page.content_updated": {
                    title: "Notion page content updated",
                    description: "A Notion page content was updated.",
                    priority: notification_1.NotificationPriority.LOW,
                },
                "page.properties_updated": {
                    title: "Notion page properties updated",
                    description: "A Notion page property was updated.",
                    priority: notification_1.NotificationPriority.LOW,
                },
                "page.moved": {
                    title: "Notion page moved",
                    description: "A Notion page was moved.",
                    priority: notification_1.NotificationPriority.LOW,
                },
                "page.deleted": {
                    title: "Notion page deleted",
                    description: "A Notion page was deleted or archived.",
                    priority: notification_1.NotificationPriority.MEDIUM,
                },
            };
            const notification = notificationMap[eventType || ""] || {
                title: "Notion workspace updated",
                description: `A ${eventType} event was received from Notion.`,
                priority: notification_1.NotificationPriority.LOW,
            };
            await (0, notifications_1.saveNotification)({
                userId,
                type: notification_1.NotificationType.SYSTEM,
                priority: notification.priority,
                title: notification.title,
                description: notification.description,
                href: `/notion?pageId=${pageId}`,
                metadata: {
                    source: "notion",
                    eventType,
                    pageId,
                    workspaceId: user.notion.workspaceId,
                },
            });
            await user_1.User.findByIdAndUpdate(userId, {
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
        let cursor;
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
            for (const result of response.results) {
                if (result.object !== "page") {
                    continue;
                }
                await notion_page_1.NotionPage.findOneAndUpdate({
                    userId,
                    notionPageId: result.id,
                }, {
                    $set: {
                        workspaceId: user.notion.workspaceId,
                        title: (0, notion_1.extractTitle)(result),
                        url: result.url,
                        icon: (0, notion_1.extractIcon)(result),
                        lastEditedTime: new Date(result.last_edited_time),
                        archived: result.archived,
                        syncedAt: new Date(),
                    },
                }, {
                    upsert: true,
                });
                syncedCount++;
            }
            cursor = response.has_more
                ? response.next_cursor ?? undefined
                : undefined;
        } while (cursor);
        await user_1.User.findByIdAndUpdate(userId, {
            $set: {
                "notion.lastSyncAt": new Date(),
            },
        });
        await (0, notifications_1.saveNotification)({
            userId,
            type: notification_1.NotificationType.SYSTEM,
            priority: notification_1.NotificationPriority.LOW,
            title: "Notion sync complete",
            description: `Synced ${syncedCount} page${syncedCount === 1
                ? ""
                : "s"} from Notion.`,
            href: "/notion",
            metadata: {
                source: "notion",
                syncedCount,
            },
        });
    }
    catch (error) {
        console.error("syncNotion error:", error);
    }
};
exports.syncNotionToDB = syncNotionToDB;
const MAX_CONTEXT_PAGES = 3;
const MAX_CHARS_PER_PAGE = 1500;
const EMPTY = { pages: [], contextBlock: "" };
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
async function getRelevantNotionContext(userId, topic) {
    try {
        if (!topic || !topic.trim())
            return EMPTY;
        const user = await user_1.User.findById(userId).select("notion");
        if (!user?.notion?.connected)
            return EMPTY;
        const terms = topic
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((t) => t.length > 2)
            .slice(0, 8);
        if (terms.length === 0)
            return EMPTY;
        const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        const regex = escaped.join("|");
        const matches = await notion_page_1.NotionPage.find({
            userId,
            archived: false,
            $or: [
                { title: { $regex: regex, $options: "i" } },
                { content: { $regex: regex, $options: "i" } },
            ],
        })
            .sort({ lastEditedTime: -1 })
            .limit(MAX_CONTEXT_PAGES);
        if (matches.length === 0)
            return EMPTY;
        const pages = matches.map((p) => ({
            title: p.title,
            url: p.url,
            excerpt: (p.content || "").slice(0, MAX_CHARS_PER_PAGE),
        }));
        const contextBlock = pages
            .map((p) => `--- ${p.title} (${p.url}) ---\n${p.excerpt || "(no content synced)"}`)
            .join("\n\n");
        return { pages, contextBlock };
    }
    catch (error) {
        console.error("getRelevantNotionContext error:", error);
        return EMPTY;
    }
}
