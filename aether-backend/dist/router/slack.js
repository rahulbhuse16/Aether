"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const slack_1 = require("../controller/slack");
const slack_bot_1 = require("../controller/slack-bot");
const slackRouter = express_1.default.Router();
slackRouter.get("/connect", slack_1.connectSlack);
slackRouter.get("/callback", slack_1.slackCallback);
// Slack Events API webhook
slackRouter.post("/webhook", slack_1.slackWebhook);
/**
 * -----------------------------------------------------------------------
 * Slack Events API — Slack calling INTO Aether (@app_mention, etc.)
 * Signature verification happens inside slackEventsRouter itself.
 * Mounts: POST /slack/events
 * -----------------------------------------------------------------------
 */
slackRouter.post("/events", express_1.default.text({ type: "*/*" }), slack_bot_1.verifySlackSignature, slack_bot_1.handleSlackEvent);
slackRouter.get("/status", slack_1.getSlackStatus);
slackRouter.get("/channels", slack_1.getChannels);
slackRouter.patch("/channels/:channelId", slack_1.toggleChannelNotifications);
/**
 * -----------------------------------------------------------------------
 * Notification preferences
 * Called from: Slack.tsx, slackSlice.ts (updateSlackPreferences)
 * -----------------------------------------------------------------------
 */
slackRouter.patch("/preferences", slack_1.updatePreferences);
/**
 * -----------------------------------------------------------------------
 * Two-way chat
 * Called from: Chat.tsx, chatSlice.ts (fetchChannelMessages, sendChatMessage)
 * -----------------------------------------------------------------------
 */
slackRouter.get("/channels/:channelId/messages", slack_1.getChannelMessages);
slackRouter.post("/channels/:channelId/messages", slack_1.sendChannelMessage);
/**
 * -----------------------------------------------------------------------
 * Slack Events API — Slack calling INTO Aether (@app_mention, etc.)
 * Signature verification happens inside slackEventsRouter itself.
 * Mounts: POST /slack/events
 * -----------------------------------------------------------------------
 */
/**
 * -----------------------------------------------------------------------
 * Aether AI-teammate activity feed
 * Called from: AetherActivity.tsx, aetherSlackSlice.ts
 * -----------------------------------------------------------------------
 */
slackRouter.get("/mentions", slack_bot_1.getMentions);
slackRouter.get("/tasks", slack_bot_1.getTasks);
slackRouter.get("/bug-analyses", slack_bot_1.getBugAnalyses);
slackRouter.get("/github-notifications", slack_bot_1.getGithubNotifications);
slackRouter.get("/daily-summary", slack_bot_1.getDailySummary);
slackRouter.post("/daily-summary/send", slack_bot_1.sendDailySummaryNow);
exports.default = slackRouter;
