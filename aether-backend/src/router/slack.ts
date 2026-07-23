import express from "express";

import {
  connectSlack,
  getChannelMessages,
  getChannels,
  getSlackStatus,
  sendChannelMessage,
  slackCallback,
  slackWebhook,
  toggleChannelNotifications,
  updatePreferences,
} from "../controller/slack";
import { verifySlackSignature, handleSlackEvent, getMentions, getTasks, getBugAnalyses, getGithubNotifications, getDailySummary, sendDailySummaryNow } from "../controller/slack-bot";


const slackRouter = express.Router();

slackRouter.get("/connect", connectSlack);
slackRouter.get("/callback", slackCallback);

// Slack Events API webhook
slackRouter.post("/webhook", slackWebhook);


/**
 * -----------------------------------------------------------------------
 * Slack Events API — Slack calling INTO Aether (@app_mention, etc.)
 * Signature verification happens inside slackEventsRouter itself.
 * Mounts: POST /slack/events
 * -----------------------------------------------------------------------
 */


slackRouter.post(
  "/events",
  express.text({ type: "*/*" }),
  handleSlackEvent
);


slackRouter.get("/status", getSlackStatus);
slackRouter.get("/channels", getChannels);
slackRouter.patch(
    "/channels/:channelId",
    toggleChannelNotifications
);
 
/**
 * -----------------------------------------------------------------------
 * Notification preferences
 * Called from: Slack.tsx, slackSlice.ts (updateSlackPreferences)
 * -----------------------------------------------------------------------
 */
slackRouter.patch("/preferences", updatePreferences);
 
/**
 * -----------------------------------------------------------------------
 * Two-way chat
 * Called from: Chat.tsx, chatSlice.ts (fetchChannelMessages, sendChatMessage)
 * -----------------------------------------------------------------------
 */
slackRouter.get(
    "/channels/:channelId/messages",
    getChannelMessages
);
slackRouter.post(
    "/channels/:channelId/messages",
    sendChannelMessage
);
 
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
 slackRouter.get("/mentions", getMentions);
 slackRouter.get("/tasks", getTasks);
 slackRouter.get(
     "/bug-analyses",
     getBugAnalyses
 );
slackRouter.get(
     "/github-notifications",
     getGithubNotifications
 );
slackRouter.get(
     "/daily-summary",
    getDailySummary
);
slackRouter.post(
     "/daily-summary/send",
    sendDailySummaryNow
);
 
export default slackRouter;

