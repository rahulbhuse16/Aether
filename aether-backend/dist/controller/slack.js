"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendChannelMessage = exports.getChannelMessages = exports.updatePreferences = exports.toggleChannelNotifications = exports.getChannels = exports.getSlackStatus = exports.slackWebhook = exports.slackCallback = exports.connectSlack = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const user_1 = require("../models/user");
const notification_1 = require("../models/notification");
const notifications_1 = require("../utils/notifications");
const env_1 = require("../config/env");
const web_api_1 = require("@slack/web-api");
/**
 * Connect Slack
 *
 * GET /api/v1/slack/connect
 */
const connectSlack = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId || typeof userId !== "string") {
            res.status(400).json({
                success: false,
                message: "userId is required",
            });
            return;
        }
        const state = `${userId}:${crypto_1.default.randomBytes(32).toString("hex")}`;
        /**
         * TODO:
         * In production, store state against userId
         * in Redis/DB to prevent CSRF attacks.
         *
         * Example:
         * await SlackOAuthState.create({ state, userId });
         */
        const params = new URLSearchParams({
            client_id: env_1.ENV.SLACK_CLIENT_ID,
            scope: [
                "channels:read",
                "channels:history",
                "chat:write",
                "users:read",
                "users:read.email",
                "groups:read",
                "app_mentions:read",
                "channels:join"
            ].join(","),
            redirect_uri: env_1.ENV.SLACK_REDIRECT_URI,
            state,
        });
        const slackOAuthUrl = `https://slack.com/oauth/v2/authorize?${params.toString()}`;
        res.redirect(slackOAuthUrl);
    }
    catch (error) {
        console.error("Slack connect error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to connect Slack",
        });
    }
};
exports.connectSlack = connectSlack;
/**
 * Slack OAuth Callback
 *
 * GET /api/v1/slack/callback
 */
const slackCallback = async (req, res) => {
    try {
        const { code, state, error } = req.query;
        if (!state || typeof state !== "string") {
            res.status(400).send("Missing OAuth state");
            return;
        }
        if (error) {
            res.status(400).send(`Slack authorization failed: ${error}`);
            return;
        }
        if (!code || typeof code !== "string") {
            res.status(400).send("Missing Slack OAuth code");
            return;
        }
        /**
         * TODO:
         * Validate state from Redis/DB before continuing.
         *
         * const oauthState = await SlackOAuthState.findOne({ state });
         * const userId = oauthState.userId;
         */
        /**
         * For now, you can pass userId in state
         * or use a temporary state mapping.
         *
         * Recommended:
         * Store state -> userId before redirecting.
         */
        const tokenResponse = await axios_1.default.post("https://slack.com/api/oauth.v2.access", null, {
            params: {
                client_id: env_1.ENV.SLACK_CLIENT_ID,
                client_secret: env_1.ENV.SLACK_CLIENT_SECRET,
                code,
                redirect_uri: env_1.ENV.SLACK_REDIRECT_URI,
            },
        });
        const slackData = tokenResponse.data;
        if (!slackData.ok) {
            console.error("Slack OAuth error:", slackData);
            res.status(400).send(slackData.error || "Slack OAuth authorization failed");
            return;
        }
        /**
         * Slack OAuth response contains:
         *
         * access_token
         * team.id
         * team.name
         * authed_user.id
         * bot_user_id
         */
        const { access_token, team, authed_user, bot_user_id, app_id, } = slackData;
        /**
         * IMPORTANT:
         * Replace this with your actual userId
         * retrieved from state.
         */
        const [userId] = state?.split(":");
        console.log("userId", userId);
        if (!userId) {
            res.status(400).send("Unable to identify Aether user");
            return;
        }
        const user = await user_1.User.findById(userId);
        if (!user) {
            res.status(404).send("Aether user not found");
            return;
        }
        /**
         * Save Slack integration details
         *
         * Add these fields to your User model:
         *
         * slackAccessToken
         * slackTeamId
         * slackTeamName
         * slackUserId
         * slackBotUserId
         * slackAppId
         * slackConnected
         */
        user.slack = {
            accessToken: access_token,
            teamId: team?.id,
            teamName: team?.name,
            userId: authed_user?.id,
            botUserId: bot_user_id,
            appId: app_id,
            connected: true,
            lastSyncAt: new Date(),
        };
        await user.save();
        await user.save();
        /**
         * Optional Aether notification
         */
        /**
         * Redirect back to Aether frontend
         */
        res.redirect(`${env_1.ENV.FRONTEND_URL}/slack?connected=true`);
    }
    catch (error) {
        console.error("Slack callback error:", error);
        res.status(500).send("Failed to complete Slack connection");
    }
};
exports.slackCallback = slackCallback;
/**
 * Slack Events API Webhook
 *
 * POST /api/v1/slack/webhook
 */
const slackWebhook = async (req, res) => {
    try {
        const payload = req.body;
        /**
         * Slack URL Verification
         */
        if (payload.type === "url_verification") {
            res.status(200).json({
                challenge: payload.challenge,
            });
            return;
        }
        /**
         * Slack sends event_callback
         */
        if (payload.type !== "event_callback") {
            res.status(200).send("OK");
            return;
        }
        const { event, team_id: teamId, event_id: eventId, } = payload;
        /**
         * Ignore bot messages
         *
         * Prevents infinite loops when Aether
         * sends messages to Slack.
         */
        if (event?.bot_id || event?.subtype === "bot_message") {
            res.status(200).send("OK");
            return;
        }
        /**
         * Find Aether user by connected Slack workspace
         */
        const user = await user_1.User.findOne({
            slackTeamId: teamId,
            slackConnected: true,
        });
        if (!user) {
            res.status(200).send("OK");
            return;
        }
        /**
         * MESSAGE EVENT
         */
        if (event?.type === "message") {
            const messageText = event.text || "New Slack message";
            await (0, notifications_1.saveNotification)({
                userId: user._id.toString(),
                type: notification_1.NotificationType.SLACK,
                priority: notification_1.NotificationPriority.MEDIUM,
                title: "New Slack message",
                description: messageText,
                href: `slack://channel?team=${teamId}&id=${event.channel}`,
                metadata: {
                    provider: "slack",
                    eventId,
                    teamId,
                    channelId: event.channel,
                    slackUserId: event.user,
                    messageTs: event.ts,
                    text: messageText,
                },
            });
        }
        /**
         * APP MENTION
         *
         * Example:
         * @Aether check this issue
         */
        if (event?.type === "app_mention") {
            const messageText = event.text || "You were mentioned in Slack";
            await (0, notifications_1.saveNotification)({
                userId: user._id.toString(),
                type: notification_1.NotificationType.SLACK,
                priority: notification_1.NotificationPriority.HIGH,
                title: "You were mentioned in Slack",
                description: messageText,
                href: `slack://channel?team=${teamId}&id=${event.channel}`,
                metadata: {
                    provider: "slack",
                    eventId,
                    teamId,
                    channelId: event.channel,
                    slackUserId: event.user,
                    messageTs: event.ts,
                    text: messageText,
                },
            });
        }
        /**
         * REACTION ADDED
         */
        if (event?.type === "reaction_added") {
            await (0, notifications_1.saveNotification)({
                userId: user._id.toString(),
                type: notification_1.NotificationType.SLACK,
                priority: notification_1.NotificationPriority.LOW,
                title: "Slack reaction added",
                description: `A reaction was added to a Slack message.`,
                href: `slack://channel?team=${teamId}&id=${event.item?.channel}`,
                metadata: {
                    provider: "slack",
                    eventId,
                    teamId,
                    reaction: event.reaction,
                    slackUserId: event.user,
                    channelId: event.item?.channel,
                    messageTs: event.item?.ts,
                },
            });
        }
        /**
         * MEMBER JOINED CHANNEL
         */
        if (event?.type === "member_joined_channel") {
            await (0, notifications_1.saveNotification)({
                userId: user._id.toString(),
                type: notification_1.NotificationType.SLACK,
                priority: notification_1.NotificationPriority.LOW,
                title: "New Slack channel member",
                description: "A member joined a Slack channel.",
                href: `slack://channel?team=${teamId}&id=${event.channel}`,
                metadata: {
                    provider: "slack",
                    eventId,
                    teamId,
                    channelId: event.channel,
                    joinedUserId: event.user,
                },
            });
        }
        /**
         * Respond immediately to Slack.
         *
         * Slack expects a successful response quickly.
         */
        res.status(200).send("OK");
    }
    catch (error) {
        console.error("Slack webhook error:", error);
        /**
         * Still return 200 to prevent unnecessary retries
         * for processing errors.
         */
        res.status(200).send("OK");
    }
};
exports.slackWebhook = slackWebhook;
const getSlackClient = (accessToken) => {
    return new web_api_1.WebClient(accessToken);
};
/**
 * --------------------------------------------------------------------------
 * Slack OAuth
 * --------------------------------------------------------------------------
 */
/**
 * --------------------------------------------------------------------------
 * Slack Status
 * --------------------------------------------------------------------------
 */
const getSlackStatus = async (req, res) => {
    try {
        const { userId } = req.query;
        const user = await user_1.User.findById(userId).select("slack");
        if (!user?.slack?.connected) {
            res.json({
                connected: false,
            });
            return;
        }
        res.json({
            connected: true,
            slack: {
                teamId: user.slack.teamId,
                teamName: user.slack.teamName,
                lastSyncAt: user.slack.lastSyncAt,
            },
        });
    }
    catch (error) {
        console.error("Get Slack status error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get Slack status",
        });
    }
};
exports.getSlackStatus = getSlackStatus;
/**
 * --------------------------------------------------------------------------
 * Get Slack Channels
 * --------------------------------------------------------------------------
 */
const getChannels = async (req, res) => {
    try {
        const { userId } = req.query;
        const user = await user_1.User.findById(userId);
        if (!user?.slack?.connected || !user.slack.accessToken) {
            res.status(400).json({
                success: false,
                message: "Slack is not connected",
            });
            return;
        }
        const slack = getSlackClient(user.slack.accessToken);
        const result = await slack.conversations.list({
            types: "public_channel,private_channel",
            exclude_archived: true,
            //@ts-ignore
            is_member: true,
        });
        res.json({
            success: true,
            channels: result.channels || [],
        });
    }
    catch (error) {
        console.error("Get Slack channels error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch Slack channels",
        });
    }
};
exports.getChannels = getChannels;
/**
 * --------------------------------------------------------------------------
 * Toggle Channel Notifications
 * --------------------------------------------------------------------------
 */
const toggleChannelNotifications = async (req, res) => {
    try {
        const { channelId } = req.params;
        const { enabled } = req.body;
        // Add your own Slack channel preference schema here.
        res.json({
            success: true,
            channelId,
            enabled,
        });
    }
    catch (error) {
        console.error("Toggle channel notifications error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update channel notifications",
        });
    }
};
exports.toggleChannelNotifications = toggleChannelNotifications;
/**
 * --------------------------------------------------------------------------
 * Slack Preferences
 * --------------------------------------------------------------------------
 */
const updatePreferences = async (req, res) => {
    try {
        const { userId } = req.body;
        const { notificationsEnabled, mentionsEnabled, githubNotificationsEnabled, dailySummaryEnabled, } = req.body;
        // Save these in your User.slack preferences object.
        res.json({
            success: true,
            preferences: {
                notificationsEnabled,
                mentionsEnabled,
                githubNotificationsEnabled,
                dailySummaryEnabled,
            },
        });
    }
    catch (error) {
        console.error("Update Slack preferences error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update Slack preferences",
        });
    }
};
exports.updatePreferences = updatePreferences;
/**
 * --------------------------------------------------------------------------
 * Get Channel Messages
 * --------------------------------------------------------------------------
 */
const getChannelMessages = async (req, res) => {
    try {
        const { channelId } = req.params;
        const { userId } = req.query;
        console.log('channelId', channelId);
        console.log('userId', userId);
        const user = await user_1.User.findById(userId);
        if (!user?.slack?.accessToken) {
            res.status(400).json({
                success: false,
                message: "Slack is not connected",
            });
            return;
        }
        const slack = getSlackClient(user.slack.accessToken);
        await slack.conversations.join({
            channel: channelId,
        });
        const result = await slack.conversations.history({
            channel: channelId,
            limit: 100,
        });
        res.json({
            success: true,
            messages: result.messages || [],
        });
    }
    catch (error) {
        console.error("Get Slack messages error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch Slack messages",
        });
    }
};
exports.getChannelMessages = getChannelMessages;
/**
 * --------------------------------------------------------------------------
 * Send Channel Message
 * --------------------------------------------------------------------------
 */
const sendChannelMessage = async (req, res) => {
    try {
        const { text, threadTs, userId } = req.body;
        const { channelId } = req.params;
        if (!text) {
            res.status(400).json({
                success: false,
                message: "Message text is required",
            });
            return;
        }
        const user = await user_1.User.findById(userId);
        if (!user?.slack?.accessToken) {
            res.status(400).json({
                success: false,
                message: "Slack is not connected",
            });
            return;
        }
        const slack = getSlackClient(user.slack.accessToken);
        const result = await slack.chat.postMessage({
            channel: channelId,
            text,
            thread_ts: threadTs,
        });
        res.json({
            success: true,
            message: result.message,
        });
    }
    catch (error) {
        console.error("Send Slack message error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to send Slack message",
        });
    }
};
exports.sendChannelMessage = sendChannelMessage;
