"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slackMessagingService = void 0;
const web_api_1 = require("@slack/web-api");
/**
 * Aether is installed per-user/per-workspace — each connected user has
 * their own Slack OAuth access token (see IUser.slack.accessToken), so
 * there is no single app-wide bot token to reuse. Every call below takes
 * that user's accessToken and builds a short-lived client from it rather
 * than sharing one module-level WebClient across all workspaces.
 */
const getClient = (accessToken) => new web_api_1.WebClient(accessToken);
exports.slackMessagingService = {
    /**
     * Plain text reply — used for general Q&A and error fallbacks.
     */
    postText: async (accessToken, channel, text, threadTs) => {
        await getClient(accessToken).chat.postMessage({
            channel,
            text,
            thread_ts: threadTs,
        });
    },
    postIssueAnalysis: async (accessToken, channel, issueNumber, analysis, threadTs) => {
        const steps = analysis.recommendedFix
            .map((step, i) => `${i + 1}. ${step}`)
            .join("\n");
        const blocks = [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Issue #${issueNumber} appears to be caused by:*\n${analysis.rootCause}`,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Recommended fix:*\n${steps}`,
                },
            },
            {
                type: "context",
                elements: [
                    { type: "mrkdwn", text: `Confidence: *${analysis.confidence}%*` },
                ],
            },
        ];
        await getClient(accessToken).chat.postMessage({
            channel,
            thread_ts: threadTs,
            text: `Issue #${issueNumber} analysis: ${analysis.rootCause}`,
            blocks,
        });
    },
    postBugAnalysis: async (accessToken, channel, analysis, threadTs) => {
        const blocks = [
            {
                type: "section",
                text: { type: "mrkdwn", text: "🔍 *Bug Analysis*" },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Root Cause:*\n${analysis.rootCause}`,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Recommended fix:*\n\`${analysis.recommendedFix}\``,
                },
            },
            {
                type: "context",
                elements: [
                    { type: "mrkdwn", text: `Confidence: *${analysis.confidence}%*` },
                ],
            },
        ];
        await getClient(accessToken).chat.postMessage({
            channel,
            thread_ts: threadTs,
            text: `Bug analysis: ${analysis.rootCause}`,
            blocks,
        });
    },
    postTaskCreated: async (accessToken, channel, task, threadTs) => {
        const blocks = [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Task created:*\n${task.title}`,
                },
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: `Priority: *${task.priority.toUpperCase()}*  ·  Source: *Slack*  ·  Created by: *${task.createdBy}*`,
                    },
                ],
            },
        ];
        await getClient(accessToken).chat.postMessage({
            channel,
            thread_ts: threadTs,
            text: `Task created: ${task.title}`,
            blocks,
        });
    },
    postGithubIssueNotification: async (accessToken, channel, args) => {
        const priorityEmoji = args.priority === "high" ? "🔴" : args.priority === "medium" ? "🟡" : "🟢";
        const blocks = [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `${priorityEmoji} *${args.priority.toUpperCase()} GitHub Issue*\n\n*Repository:* ${args.repository}\n*Issue:* ${args.issueTitle}\n*Assigned to:* ${args.assignedTo}`,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Aether AI Analysis*\n${args.aiAnalysis}`,
                },
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: { type: "plain_text", text: "Open in Aether" },
                        url: args.aetherUrl,
                    },
                    {
                        type: "button",
                        text: { type: "plain_text", text: "Open GitHub" },
                        url: args.githubUrl,
                    },
                ],
            },
        ];
        await getClient(accessToken).chat.postMessage({
            channel,
            text: `${args.priority.toUpperCase()} GitHub issue: ${args.issueTitle}`,
            blocks,
        });
    },
    postDailySummary: async (accessToken, channel, stats, insights) => {
        const insightLines = insights.insights.length
            ? insights.insights.map((line) => `⚠️ ${line}`).join("\n")
            : "No unusual patterns today.";
        const blocks = [
            {
                type: "section",
                text: { type: "mrkdwn", text: "📊 *Aether Daily Engineering Summary*" },
            },
            {
                type: "section",
                fields: [
                    { type: "mrkdwn", text: `*GitHub opened*\n${stats.githubOpened}` },
                    { type: "mrkdwn", text: `*GitHub closed*\n${stats.githubClosed}` },
                    { type: "mrkdwn", text: `*High-priority bugs*\n${stats.highPriorityBugs}` },
                    { type: "mrkdwn", text: `*Tasks completed*\n${stats.tasksCompleted}` },
                    { type: "mrkdwn", text: `*Tasks overdue*\n${stats.tasksOverdue}` },
                ],
            },
            {
                type: "section",
                text: { type: "mrkdwn", text: `*AI Insights*\n${insightLines}` },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `🔥 *Recommended Action*\n${insights.recommendedAction}`,
                },
            },
        ];
        await getClient(accessToken).chat.postMessage({
            channel,
            text: "Aether Daily Engineering Summary",
            blocks,
        });
    },
};
