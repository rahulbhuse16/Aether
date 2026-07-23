import express, { Request, Response, Router } from "express";
import crypto from "crypto";
import { User } from "../models/user";
import { Task } from "../models/task";
import { ENV } from "../config/env";
import { groqService } from "../services/groq";
import { slackMessagingService } from "../services/slack";
import { githubService } from "../services/github";
import { WebClient } from "@slack/web-api";
import Groq from "groq-sdk";

const { SLACK_SIGNING_SECRET } = ENV;


/**
 * Slack signs the raw request body, so this route needs the raw text, not
 * the app's usual express.json() parsing. Mounting express.text() here
 * (rather than globally) keeps every other route on normal JSON parsing.
 */


/**
 * Verifies the request actually came from Slack using the app's signing
 * secret (one value, shared across every connected workspace — this is
 * not the same as the per-user access token). Rejects requests older than
 * 5 minutes to prevent replay attacks.
 */
export function verifySlackSignature(
    req: Request,
    res: Response,
    next: express.NextFunction
): void {
    try {
        const timestamp = req.headers["x-slack-request-timestamp"] as string;
        const signature = req.headers["x-slack-signature"] as string;

        if (!timestamp || !signature) {
            res.status(400).send("Missing Slack signature headers");
            return;
        }

        const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
        if (Number(timestamp) < fiveMinutesAgo) {
            res.status(400).send("Request timestamp too old");
            return;
        }

        const rawBody = req.body as unknown as string;
        const baseString = `v0:${timestamp}:${rawBody}`;

        const computedSignature =
            "v0=" +
            crypto
                .createHmac("sha256", SLACK_SIGNING_SECRET)
                .update(baseString)
                .digest("hex");

        const isValid = crypto.timingSafeEqual(
            Buffer.from(computedSignature),
            Buffer.from(signature)
        );

        if (!isValid) {
            res.status(401).send("Invalid Slack signature");
            return;
        }

        next();
    } catch (error) {
        console.error("Slack signature verification error:", error);
        res.status(401).send("Signature verification failed");
    }
}

/**
 * Handles Slack's Events API payloads. Slack requires an HTTP 200 within
 * ~3 seconds or it retries the same event — since the actual work here
 * (Groq call, GitHub lookup, DB write) can take longer than that, we ack
 * immediately and do the real work asynchronously.
 */
export async function handleSlackEvent(req: Request, res: Response): Promise<void> {
    let payload: any;
   
    console.log("🔥 SLACK EVENT RECEIVED");
  console.log("BODY:", req.body);
  console.log("TYPE:", typeof req.body);

    try {
        payload = JSON.parse(req.body as unknown as string);
    } catch {
        res.status(400).send("Invalid JSON payload");
        return;
    }

    /**
     * One-time handshake Slack sends when the Events API endpoint is first
     * configured.
     */
    
    if (payload.type === "url_verification") {
        res.status(200).json({ challenge: payload.challenge });
        return;
    }

    /**
     * Ack immediately. Slack resends the same event (with an
     * x-slack-retry-num header) if it doesn't get a fast 200, and duplicate
     * app_mentions would otherwise trigger duplicate AI calls, tasks, and
     * Slack replies.
     */
    res.status(200).send("OK");

    if (req.headers["x-slack-retry-num"]) {
        return;
    }

    const event = payload.event;

    if (!event || event.type !== "app_mention") {
        return;
    }

    /**
     * Ignore anything posted by a bot (including Aether's own replies).
     * app_mention normally only fires for human-authored messages, but
     * this guard is cheap insurance against a feedback loop.
     */
    if (event.bot_id) {
        return;
    }

    processMention(event, payload.team_id).catch((error) => {
        console.error("Aether Slack mention processing error:", error);
    });
}

/**
 * Routes an @app_mention through classification into the right handler,
 * then posts Aether's reply back into the same Slack thread using that
 * workspace's own connected access token.
 */
async function processMention(
    event: {
        channel: string;
        user: string;
        text: string;
        ts: string;
        thread_ts?: string;
    },
    teamId: string
): Promise<void> {
    const threadTs = event.thread_ts || event.ts;

    /**
     * Users connect Slack per-workspace (IUser.slack), so the lookup keys
     * on both the Slack user id and the team id — the same Slack user id
     * could in principle exist in two different connected workspaces.
     */
    const user = await User.findOne({
        "slack.userId": event.user,
        "slack.teamId": teamId,
        "slack.connected": true,
    });

    if (!user || !user.slack?.accessToken) {
        // No accessToken to reply with yet — nothing safe to post back.
        return;
    }

    // Never respond to Aether's own bot user, even without a bot_id present.
    if (user.slack.botUserId && event.user === user.slack.botUserId) {
        return;
    }

    const accessToken = user.slack.accessToken;

    try {
        const messageText = event.text.replace(/<@[^>]+>/g, "").trim();

        if (!messageText) {
            await slackMessagingService.postText(
                accessToken,
                event.channel,
                "What would you like help with? Try: \"analyze issue #142\", \"create a task: ...\", or paste an error.",
                threadTs
            );
            return;
        }

        const classification = await groqService.classifyMention(messageText);

        switch (classification.intent) {
            case "analyze_issue": {
                if (!classification.issueNumber) {
                    await slackMessagingService.postText(
                        accessToken,
                        event.channel,
                        "Which issue number should I look at?",
                        threadTs
                    );
                    break;
                }

                const issueContext = await githubService.getIssueContext(
                    user._id.toString(),
                    classification.issueNumber
                );

                if (!issueContext) {
                    await slackMessagingService.postText(
                        accessToken,
                        event.channel,
                        `I couldn't find issue #${classification.issueNumber} on your connected repository.`,
                        threadTs
                    );
                    break;
                }

                const analysis = await groqService.analyzeGithubIssue(issueContext);

                await slackMessagingService.postIssueAnalysis(
                    accessToken,
                    event.channel,
                    classification.issueNumber,
                    analysis,
                    threadTs
                );
                break;
            }

            case "create_task": {
                const title = classification.taskTitle?.trim();

                if (!title) {
                    await slackMessagingService.postText(
                        accessToken,
                        event.channel,
                        "I need a task title — try \"@Aether create a task: <title>, priority high\".",
                        threadTs
                    );
                    break;
                }

                const task = await Task.create({
                    title,
                    priority: classification.taskPriority || "medium",
                    status: "open",
                    source: "slack",
                    createdBy: user._id,
                });

                await slackMessagingService.postTaskCreated(
                    accessToken,
                    event.channel,
                    {
                        title: task.title,
                        priority: task.priority as string,
                        createdBy: user.fullName || user.email,
                    },
                    threadTs
                );
                break;
            }

            case "bug_report": {
                const analysis = await groqService.analyzeBugReport(messageText);

                await slackMessagingService.postBugAnalysis(
                    accessToken,
                    event.channel,
                    analysis,
                    threadTs
                );
                break;
            }

            case "general_question":
            default: {
                const answer = await groqService.answerGeneralQuestion(messageText);

                await slackMessagingService.postText(
                    accessToken,
                    event.channel,
                    answer,
                    threadTs
                );
                break;
            }
        }

       
    } catch (error) {
        console.error("Aether Slack mention error:", error);

        await slackMessagingService.postText(
            accessToken,
            event.channel,
            "Something went wrong on my end processing that — mind trying again in a moment?",
            threadTs
        );
    }
}




/**
 * -----------------------------------------------------------------------
 * No database models here by design. Slack's own channel history is the
 * record of truth — every endpoint below re-reads the last N days of
 * messages the connected workspace already has and has Groq extract or
 * analyze what's needed on the fly. `User` is only consulted for
 * `slack.accessToken` / `slack.botUserId` / `githubUsername`.
 *
 * Trade-off worth knowing: this re-scans Slack + re-calls Groq on every
 * request, so it's slower and costs more tokens than a DB-backed version
 * would. Fine for a activity feed people check occasionally; if this page
 * gets hit often, consider a short in-memory/Redis cache per userId.
 *
 * Slack scopes required on the bot token: channels:history,
 * groups:history, channels:read, groups:read (add im:history/mpim:history
 * too if DMs should count).
 * -----------------------------------------------------------------------
 */

const { GROQ_API_KEY } = ENV;
const groq = new Groq({ apiKey: GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";
const HISTORY_LOOKBACK_DAYS = 7;
const MAX_MESSAGES_PER_CHANNEL = 200;

async function extractJson<T>(system: string, transcript: string): Promise<T> {
    const response = await groq.chat.completions.create({
        model: MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
            { role: "system", content: system },
            { role: "user", content: transcript || "(no messages)" },
        ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Groq returned an empty response");
    return JSON.parse(content) as T;
}

/**
 * Returns every channel the bot is actually a member of — no point
 * scanning channels it can't read.
 */
async function listBotChannels(
    client: WebClient
): Promise<{ id: string; name: string }[]> {
    const { channels } = await client.conversations.list({
        types: "public_channel,private_channel",
        exclude_archived: true,
        limit: 100,
    });

    return (channels || [])
        .filter((c) => c.is_member)
        .map((c) => ({ id: c.id as string, name: c.name as string }));
}

/**
 * Flattens a channel's recent history into a compact transcript string:
 * "[2026-07-22T09:12:00.000Z] userOrBot: message text"
 */
async function fetchChannelTranscript(
    client: WebClient,
    channelId: string,
    channelName: string,
    oldestTs: string
): Promise<string> {
    const { messages } = await client.conversations.history({
        channel: channelId,
        oldest: oldestTs,
        limit: MAX_MESSAGES_PER_CHANNEL,
    });

    return (messages || [])
        .slice()
        .reverse()
        .map((m) => {
            const ts = new Date(Number(m.ts) * 1000).toISOString();
            const speaker = m.bot_id ? "Aether" : m.user || "unknown";
            return `[${ts}] #${channelName} ${speaker}: ${m.text || ""}`;
        })
        .join("\n");
}

async function getFullTranscript(
    client: WebClient,
    sinceDaysAgo: number
): Promise<string> {
    const oldestTs = (
        (Date.now() - sinceDaysAgo * 24 * 60 * 60 * 1000) /
        1000
    ).toString();

    const channels = await listBotChannels(client);

    const transcripts = await Promise.all(
        channels.map((c) => fetchChannelTranscript(client, c.id, c.name, oldestTs))
    );

    return transcripts.filter(Boolean).join("\n");
}

function getSlackClientForUser(user: any): WebClient | null {
    if (!user?.slack?.connected || !user.slack.accessToken) return null;
    return new WebClient(user.slack.accessToken);
}

/**
 * -----------------------------------------------------------------------
 * @Aether mentions
 * -----------------------------------------------------------------------
 */
export const getMentions = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.query;
        if (!userId) {
            res.status(400).json({ message: "userId is required" });
            return;
        }

        const user = await User.findById(userId);
        const client = getSlackClientForUser(user);
        if (!client) {
            res.status(400).json({ message: "Slack is not connected for this user" });
            return;
        }

        const transcript = await getFullTranscript(client, HISTORY_LOOKBACK_DAYS);

        const system = `You are extracting structured data from a Slack transcript for Aether, an AI engineering teammate bot.
Find every place a human mentioned Aether and Aether replied. Pair each human message with Aether's next reply in the same channel.
Respond ONLY with JSON, no prose, matching exactly:
{ "mentions": [ { "channel": string, "userName": string, "question": string, "response": string, "confidence": number | null, "relatedGithubIssue": string | null, "timestamp": string } ] }
- channel is the channel name without "#".
- confidence: if Aether's reply states a confidence percentage, use it; otherwise null.
- relatedGithubIssue: an issue reference like "#142" if the exchange mentions one, otherwise null.
- timestamp: the ISO timestamp of the human's message.
- Sort by timestamp descending. Return at most 50 entries. If there are none, return { "mentions": [] }.`;

        const { mentions } = await extractJson<{ mentions: any[] }>(system, transcript);

        res.status(200).json(
            mentions.map((m, i) => ({ id: `mn-${i}-${m.timestamp}`, ...m }))
        );
    } catch (error) {
        console.error("getMentions error:", error);
        res.status(500).json({ message: "Failed to load Aether mentions" });
    }
};

/**
 * -----------------------------------------------------------------------
 * Tasks created via Slack — Aether posts a "Task created:" confirmation
 * block when it handles a create_task intent; this reconstructs the task
 * list purely by reading those confirmations back out of the transcript.
 * -----------------------------------------------------------------------
 */
export const getTasks = async (req: Request, res: Response): Promise<void> => {
    console.log("calling")
    try {
        const { userId } = req.query;
        if (!userId) {
            res.status(400).json({ message: "userId is required" });
            return;
        }

        const user = await User.findById(userId);
        const client = getSlackClientForUser(user);
        if (!client) {
            res.status(400).json({ message: "Slack is not connected for this user" });
            return;
        }

        const transcript = await getFullTranscript(client, HISTORY_LOOKBACK_DAYS);

        const system = `You are extracting structured data from a Slack transcript for Aether, an AI engineering teammate bot.
Aether posts a confirmation message whenever it creates a task from a Slack mention — it looks like "Task created: <title>" followed by "Priority: X · Source: Slack · Created by: Y".
Find every such confirmation and extract it.
Respond ONLY with JSON, no prose, matching exactly:
{ "tasks": [ { "title": string, "priority": "low" | "medium" | "high", "createdBy": string, "createdAt": string } ] }
- createdAt is the ISO timestamp of Aether's confirmation message.
- Sort by createdAt descending. Return at most 50 entries. If there are none, return { "tasks": [] }.`;

        const { tasks } = await extractJson<{ tasks: any[] }>(system, transcript);

        console.log("tasks:", tasks);


        res.status(200).json(
            tasks.map((t, i) => ({
                id: `tk-${i}-${t.createdAt}`,
                status: "open",
                source: "slack",
                ...t,
            }))
        );
    } catch (error) {
        console.error("getTasks error:", error);
        res.status(500).json({ message: "Failed to load Slack-created tasks" });
    }
};

/**
 * -----------------------------------------------------------------------
 * Bug analyses — Aether's "🔍 Bug Analysis" replies, reconstructed the
 * same way.
 * -----------------------------------------------------------------------
 */
export const getBugAnalyses = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.query;
        if (!userId) {
            res.status(400).json({ message: "userId is required" });
            return;
        }

        const user = await User.findById(userId);
        const client = getSlackClientForUser(user);
        if (!client) {
            res.status(400).json({ message: "Slack is not connected for this user" });
            return;
        }

        const transcript = await getFullTranscript(client, HISTORY_LOOKBACK_DAYS);

        const system = `You are extracting structured data from a Slack transcript for Aether, an AI engineering teammate bot.
Find every human message where someone pasted an error/stack trace to Aether, and Aether's "🔍 Bug Analysis" reply with a Root Cause, a recommended fix, and a confidence percentage.
Respond ONLY with JSON, no prose, matching exactly:
{ "bugAnalyses": [ { "channel": string, "userName": string, "errorSnippet": string, "rootCause": string, "recommendedFix": string, "confidence": number, "timestamp": string } ] }
- errorSnippet is the human's original pasted error, trimmed to one line if long.
- timestamp is the ISO timestamp of Aether's reply.
- Sort by timestamp descending. Return at most 50 entries. If there are none, return { "bugAnalyses": [] }.`;

        const { bugAnalyses } = await extractJson<{ bugAnalyses: any[] }>(
            system,
            transcript
        );

        res.status(200).json(
            bugAnalyses.map((b, i) => ({ id: `bg-${i}-${b.timestamp}`, ...b }))
        );
    } catch (error) {
        console.error("getBugAnalyses error:", error);
        res.status(500).json({ message: "Failed to load bug analyses" });
    }
};

/**
 * -----------------------------------------------------------------------
 * GitHub → Slack notifications — reconstructed from Aether's
 * "<emoji> <PRIORITY> GitHub Issue" blocks.
 * -----------------------------------------------------------------------
 */
export const getGithubNotifications = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const { userId } = req.query;
        if (!userId) {
            res.status(400).json({ message: "userId is required" });
            return;
        }

        const user = await User.findById(userId);
        const client = getSlackClientForUser(user);
        if (!client) {
            res.status(400).json({ message: "Slack is not connected for this user" });
            return;
        }

        const transcript = await getFullTranscript(client, HISTORY_LOOKBACK_DAYS);

        const system = `You are extracting structured data from a Slack transcript for Aether, an AI engineering teammate bot.
Find every Aether message formatted like "<emoji> <PRIORITY> GitHub Issue" followed by Repository, Issue, Assigned to, and an "Aether AI Analysis" section.
Respond ONLY with JSON, no prose, matching exactly:
{ "notifications": [ { "repository": string, "issueTitle": string, "priority": "low" | "medium" | "high", "assignedTo": string, "aiAnalysis": string, "timestamp": string } ] }
- timestamp is the ISO timestamp of the message.
- Sort by timestamp descending. Return at most 50 entries. If there are none, return { "notifications": [] }.`;

        const { notifications } = await extractJson<{ notifications: any[] }>(
            system,
            transcript
        );

        res.status(200).json(
            notifications.map((n, i) => ({
                id: `gn-${i}-${n.timestamp}`,
                githubUrl: "",
                aetherUrl: "",
                ...n,
            }))
        );
    } catch (error) {
        console.error("getGithubNotifications error:", error);
        res.status(500).json({ message: "Failed to load GitHub notifications" });
    }
};

/**
 * -----------------------------------------------------------------------
 * Daily summary — counts are done in code (string matching against
 * today's transcript, not left to the model), so the stats can't be
 * hallucinated; Groq is only used for the "insights" and
 * "recommendedAction" text, same as before.
 * -----------------------------------------------------------------------
 */
async function buildDailySummary(client: WebClient) {
    const startOfDayTs = (
        new Date(new Date().setHours(0, 0, 0, 0)).getTime() / 1000
    ).toString();

    const channels = await listBotChannels(client);
    const todaysMessages = (
        await Promise.all(
            channels.map((c) =>
                client.conversations.history({
                    channel: c.id,
                    oldest: startOfDayTs,
                    limit: MAX_MESSAGES_PER_CHANNEL,
                })
            )
        )
    ).flatMap((r) => r.messages || []);

    const botMessages = todaysMessages.filter((m) => m.bot_id);
    const humanMessages = todaysMessages.filter((m) => !m.bot_id);

    const countMatching = (list: typeof todaysMessages, pattern: RegExp) =>
        list.filter((m) => pattern.test(m.text || "")).length;

    const stats = {
        githubOpened: countMatching(botMessages, /GitHub Issue/),
        githubClosed: countMatching(humanMessages, /\bclosed\b.*#\d+|resolved.*#\d+/i),
        highPriorityBugs: countMatching(botMessages, /HIGH GitHub Issue|🔴/),
        tasksCompleted: countMatching(humanMessages, /\bdone\b|\bcompleted\b/i),
        tasksOverdue: countMatching(botMessages, /overdue/i),
    };

    const topIssueTitles = botMessages
        .filter((m) => /GitHub Issue/.test(m.text || ""))
        .slice(0, 10)
        .map((m) => (m.text || "").split("\n")[0]);

    const insights =
        Object.values(stats).every((v) => v === 0)
            ? { insights: [], recommendedAction: "No notable activity in Slack today." }
            : await groqService.generateDailySummaryInsights({
                  ...stats,
                  topIssueTitles,
              });

    return { stats, insights };
}

export const getDailySummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.query;
        if (!userId) {
            res.status(400).json({ message: "userId is required" });
            return;
        }

        const user = await User.findById(userId);
        const client = getSlackClientForUser(user);
        if (!client) {
            res.status(400).json({ message: "Slack is not connected for this user" });
            return;
        }

        const { stats, insights } = await buildDailySummary(client);

        res.status(200).json({
            date: new Date().toISOString(),
            ...stats,
            insights: insights.insights,
            recommendedAction: insights.recommendedAction,
        });
    } catch (error) {
        console.error("getDailySummary error:", error);
        res.status(500).json({ message: "Failed to build daily summary" });
    }
};

export const sendDailySummaryNow = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, channelId } = req.body;
        if (!userId || !channelId) {
            res.status(400).json({ message: "userId and channelId are required" });
            return;
        }

        const user = await User.findById(userId);
        const client = getSlackClientForUser(user);
        if (!client) {
            res.status(400).json({ message: "Slack is not connected for this user" });
            return;
        }

        const { stats, insights } = await buildDailySummary(client);

        await slackMessagingService.postDailySummary(
            user!.slack.accessToken,
            channelId,
            stats,
            insights
        );

        res.status(200).json({ success: true, sentAt: new Date().toISOString() });
    } catch (error) {
        console.error("sendDailySummaryNow error:", error);
        res.status(500).json({ message: "Failed to send daily summary" });
    }
};