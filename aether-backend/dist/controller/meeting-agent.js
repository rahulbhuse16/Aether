"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMeetings = listMeetings;
exports.uploadMeeting = uploadMeeting;
exports.createJiraTickets = createJiraTickets;
exports.emailMeetingSummary = emailMeetingSummary;
const groq_sdk_1 = __importStar(require("groq-sdk"));
const env_1 = require("../config/env");
const meeting_agent_1 = require("../models/meeting-agent");
const nodemailer_1 = __importDefault(require("nodemailer"));
const groq = new groq_sdk_1.default({ apiKey: env_1.ENV.GROQ_API_KEY });
// Groq's hosted Whisper model for transcription, and a fast Llama model for
// the reasoning/summarization pass. Keep these two concerns on separate
// calls: transcription must stay verbatim, summarization must stay creative.
const GROQ_TRANSCRIBE_MODEL = "whisper-large-v3";
const GROQ_CHAT_MODEL = "llama-3.3-70b-versatile";
// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------
const GROQ_TEMPERATURE = 0.3; // low temperature: minutes/action items must stay factual, not embellished
const GROQ_COMPLETION_TOKENS = 1600;
const GROQ_MAX_RETRIES = 2;
const MAX_ACTION_ITEMS = 12;
const MAX_TRANSCRIPT_CHARS_FOR_LLM = 24000; // guard against oversized transcripts blowing the context window
// -----------------------------------------------------------------------------
// System instructions
// -----------------------------------------------------------------------------
const MINUTES_SYSTEM_INSTRUCTION = `You are Aether Meeting AI, an assistant that turns a raw meeting transcript into accurate, concise minutes.

You will be given the full transcript of a single recorded meeting. You must extract ONLY what was actually said — never invent participants, decisions, or action items that are not clearly supported by the transcript.

Rules for "title":
- A short, specific title for the meeting (3-6 words) based on its actual content, e.g. "Sprint Planning — Auth Refactor". If the transcript opens with a stated meeting name, prefer that.

Rules for "summary":
- Two to four sentences, plain language, covering what was discussed and any decisions made.
- Do not pad with generic filler like "the team had a productive discussion" — state the substantive topics and outcomes.
- If the transcript is too short or unclear to summarize meaningfully, say so honestly in one sentence rather than fabricating content.

Rules for "actionItems":
- Extract concrete, actionable follow-ups that were explicitly stated or clearly implied (e.g. "I'll fix the login bug" -> "Fix the login bug").
- Each item should be a short imperative phrase (max ~12 words). Include the owner's name in parentheses if the transcript names one, e.g. "Optimize Redis cache layer (Rahul)".
- Do not exceed ${MAX_ACTION_ITEMS} items. Order them by the sequence they were raised in the meeting.
- If no action items were discussed, return an empty array — never invent filler tasks.

You must output STRICT JSON and nothing else, matching exactly this schema:
{
  "title": "string",
  "summary": "string",
  "actionItems": ["string", "..."]
}

Never output markdown. Never output explanations. Never output conversational text outside the JSON object.`;
const TICKETS_SYSTEM_INSTRUCTION = `You are Aether Meeting AI, converting a meeting's action items into well-formed engineering tickets.

You will be given a meeting title, its summary, and a list of action items. For EACH action item, produce exactly one ticket.

Rules:
- "summary" is a short imperative ticket title (max 10 words), cleaned up from the action item (drop any owner name in parentheses).
- "description" is one to two sentences giving an engineer enough context to start work, grounded only in the meeting summary/action item provided — do not invent technical details that weren't mentioned.
- "priority" must be exactly one of "Low", "Medium", "High", inferred from urgency language in the action item/summary (e.g. "EOD", "blocking", "critical" -> High; routine follow-up -> Medium; nice-to-have/exploratory -> Low). Default to "Medium" if unclear.

You must output STRICT JSON and nothing else, matching exactly this schema:
{
  "tickets": [
    { "summary": "string", "description": "string", "priority": "Low | Medium | High" }
  ]
}

Never output markdown. Never output explanations. Never output conversational text outside the JSON object.`;
const EMAIL_SYSTEM_INSTRUCTION = `You are Aether Meeting AI, drafting a concise recap email to send to meeting attendees.

You will be given a meeting title, date, summary, and action items. Write a short professional email recapping the meeting.

Rules:
- "subject" is a short email subject line referencing the meeting title/date.
- "body" is plain text (no markdown, no HTML), 3-6 short paragraphs/lines: a one-line greeting, the summary in your own words, a bulleted-style action items list using "- " prefixes on their own lines, and a brief sign-off. Keep it grounded strictly in the provided summary and action items — do not add content that wasn't given to you.

You must output STRICT JSON and nothing else, matching exactly this schema:
{
  "subject": "string",
  "body": "string"
}

Never output markdown formatting characters like ** or #. Never output explanations outside the JSON object.`;
// -----------------------------------------------------------------------------
// Helpers: response parsing / validation
// -----------------------------------------------------------------------------
function safeParseJson(raw) {
    const cleaned = raw
        .trim()
        .replace(/^```(json)?/i, "")
        .replace(/```$/, "")
        .trim();
    try {
        return JSON.parse(cleaned);
    }
    catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            }
            catch {
                return null;
            }
        }
        return null;
    }
}
function isValidMinutesOutput(value) {
    return (!!value &&
        typeof value.summary === "string" &&
        value.summary.trim().length > 0 &&
        Array.isArray(value.actionItems) &&
        value.actionItems.every((i) => typeof i === "string"));
}
function isValidTicketsOutput(value) {
    return !!value && Array.isArray(value.tickets);
}
function isValidEmailOutput(value) {
    return !!value && typeof value.subject === "string" && typeof value.body === "string";
}
function normalizePriority(priority) {
    const p = (priority || "").trim().toLowerCase();
    if (p === "high")
        return "High";
    if (p === "low")
        return "Low";
    return "Medium";
}
function formatDisplayDate(d) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatDuration(seconds) {
    if (!seconds || seconds <= 0)
        return "—";
    const mins = Math.round(seconds / 60);
    if (mins < 1)
        return "<1 min";
    return `${mins} min`;
}
function parseRetryAfterSeconds(message) {
    const match = message.match(/try again in\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+(?:\.\d+)?)s)?/i);
    if (!match)
        return undefined;
    const hours = Number(match[1] || 0);
    const minutes = Number(match[2] || 0);
    const seconds = Number(match[3] || 0);
    const total = hours * 3600 + minutes * 60 + seconds;
    return total > 0 ? Math.ceil(total) : undefined;
}
function inspectGroqError(err) {
    const status = err?.status ?? err?.response?.status;
    const apiError = err?.error?.error ?? err?.error;
    const code = apiError?.code;
    const message = apiError?.message || err?.message || "Unknown Groq error";
    if (status !== 429 && code !== "rate_limit_exceeded") {
        return { isRateLimited: false, scope: "unknown", message };
    }
    const scope = /tokens per day|TPD/i.test(message)
        ? "day"
        : /tokens per minute|TPM/i.test(message)
            ? "minute"
            : "unknown";
    return { isRateLimited: true, scope, retryAfterSeconds: parseRetryAfterSeconds(message), message };
}
class GroqRateLimitError extends Error {
    constructor(info) {
        super(info.message);
        this.rateLimit = info;
    }
}
// -----------------------------------------------------------------------------
// Groq calls
// -----------------------------------------------------------------------------
async function transcribeAudio(buffer, filename) {
    if (!env_1.ENV.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is not configured on the server");
    }
    try {
        const transcription = await groq.audio.transcriptions.create({
            file: await (0, groq_sdk_1.toFile)(buffer, filename),
            model: GROQ_TRANSCRIBE_MODEL,
            response_format: "verbose_json",
            language: "en",
        });
        // verbose_json returns { text, duration, segments, ... }
        const text = transcription.text?.trim() || "";
        const durationSeconds = Number(transcription.duration) || 0;
        if (!text) {
            throw new Error("Transcription returned no speech content");
        }
        return { text, durationSeconds };
    }
    catch (err) {
        const rateLimitInfo = inspectGroqError(err);
        if (rateLimitInfo.isRateLimited)
            throw new GroqRateLimitError(rateLimitInfo);
        throw err;
    }
}
async function runJsonCompletion(systemInstruction, userContent, validate) {
    let lastError = null;
    for (let attempt = 1; attempt <= GROQ_MAX_RETRIES; attempt++) {
        try {
            const completion = await groq.chat.completions.create({
                model: GROQ_CHAT_MODEL,
                temperature: GROQ_TEMPERATURE,
                max_tokens: GROQ_COMPLETION_TOKENS,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: systemInstruction },
                    {
                        role: "user",
                        content: attempt === 1
                            ? userContent
                            : `${userContent}\n\nYour previous response was not valid JSON matching the required schema. Return ONLY the raw JSON object this time — no markdown, no commentary, no missing fields.`,
                    },
                ],
            });
            const raw = completion.choices[0]?.message?.content || "";
            const parsed = safeParseJson(raw);
            if (validate(parsed)) {
                return parsed;
            }
            lastError = new Error("Groq returned a response that did not match the expected schema");
        }
        catch (err) {
            const rateLimitInfo = inspectGroqError(err);
            if (rateLimitInfo.isRateLimited)
                throw new GroqRateLimitError(rateLimitInfo);
            lastError = err;
            console.warn(`[meetingAgent] Groq call attempt ${attempt} failed:`, err.message);
        }
    }
    throw lastError || new Error("Groq returned an empty or invalid response");
}
async function generateMinutes(transcript) {
    const truncated = transcript.slice(0, MAX_TRANSCRIPT_CHARS_FOR_LLM);
    return runJsonCompletion(MINUTES_SYSTEM_INSTRUCTION, `Meeting transcript:\n"""\n${truncated}\n"""`, isValidMinutesOutput);
}
async function generateTickets(meeting) {
    const actionItemsList = meeting.actionItems.map((item, i) => `${i + 1}. ${item}`).join("\n");
    return runJsonCompletion(TICKETS_SYSTEM_INSTRUCTION, `Meeting title: ${meeting.title}\nMeeting summary: ${meeting.summary}\nAction items:\n${actionItemsList}`, isValidTicketsOutput);
}
async function generateEmail(meeting) {
    const actionItemsList = meeting.actionItems.map((item) => `- ${item}`).join("\n");
    return runJsonCompletion(EMAIL_SYSTEM_INSTRUCTION, `Meeting title: ${meeting.title}\nMeeting date: ${meeting.date}\nMeeting summary: ${meeting.summary}\nAction items:\n${actionItemsList}`, isValidEmailOutput);
}
// -----------------------------------------------------------------------------
// Optional live integrations (Jira ticket creation, email sending).
// Both degrade gracefully to "generated but not delivered" when unconfigured,
// so the AI features stay fully demoable without external credentials.
// -----------------------------------------------------------------------------
async function tryCreateJiraTicket(ticket) {
    if (!env_1.ENV.JIRA_BASE_URL || !env_1.ENV.JIRA_EMAIL || !env_1.ENV.JIRA_API_TOKEN || !env_1.ENV.JIRA_PROJECT_KEY) {
        return undefined; // Jira not configured — ticket stays generated-only
    }
    const auth = Buffer.from(`${env_1.ENV.JIRA_EMAIL}:${env_1.ENV.JIRA_API_TOKEN}`).toString("base64");
    const res = await fetch(`${env_1.ENV.JIRA_BASE_URL}/rest/api/3/issue`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            fields: {
                project: { key: env_1.ENV.JIRA_PROJECT_KEY },
                summary: ticket.summary,
                description: {
                    type: "doc",
                    version: 1,
                    content: [{ type: "paragraph", content: [{ type: "text", text: ticket.description }] }],
                },
                issuetype: { name: "Task" },
                priority: { name: ticket.priority },
            },
        }),
    });
    if (!res.ok) {
        console.warn("[meetingAgent] Jira ticket creation failed:", await res.text());
        return undefined;
    }
    const data = (await res.json());
    return data.key;
}
async function trySendEmail(subject, body) {
    if (!env_1.ENV.SMTP_HOST || !env_1.ENV.SMTP_USER || !env_1.ENV.SMTP_PASS || !env_1.ENV.SMTP_FROM) {
        return false; // SMTP not configured — email stays generated-only
    }
    const transporter = nodemailer_1.default.createTransport({
        host: env_1.ENV.SMTP_HOST,
        port: Number(env_1.ENV.SMTP_PORT) || 587,
        secure: Number(env_1.ENV.SMTP_PORT) === 465,
        auth: { user: env_1.ENV.SMTP_USER, pass: env_1.ENV.SMTP_PASS },
    });
    await transporter.sendMail({
        from: env_1.ENV.SMTP_FROM,
        to: env_1.ENV.SMTP_FROM, // recap sent to the organizer inbox; wire up attendee list once available
        subject,
        text: body,
    });
    return true;
}
// -----------------------------------------------------------------------------
// DTO mapping
// -----------------------------------------------------------------------------
function toDTO(meeting) {
    return {
        id: meeting.id,
        title: meeting.title,
        date: meeting.date,
        duration: meeting.duration,
        status: meeting.status,
        summary: meeting.summary,
        actionItems: meeting.actionItems,
        ticketsCreated: meeting.ticketsCreated,
        tickets: meeting.tickets,
        emailSent: meeting.emailSent,
        emailSummary: meeting.emailSummary,
    };
}
function handleRateLimit(res, rateLimit) {
    if (rateLimit.retryAfterSeconds) {
        res.set("Retry-After", String(rateLimit.retryAfterSeconds));
    }
    return res.status(429).json({
        success: false,
        message: rateLimit.scope === "day"
            ? "Daily AI generation budget has been used up for today. Try again later."
            : "AI generation is temporarily rate-limited. Try again in a moment.",
        scope: rateLimit.scope,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
}
// -----------------------------------------------------------------------------
// Controllers
// -----------------------------------------------------------------------------
/**
 * GET /api/meetings
 */
async function listMeetings(req, res) {
    try {
        const meetings = await meeting_agent_1.MeetingModel.find().sort({ createdAt: -1 }).limit(100);
        return res.status(200).json({ success: true, meetings: meetings.map(toDTO) });
    }
    catch (err) {
        console.error("[meetingAgent.listMeetings]", err);
        return res.status(500).json({ success: false, message: err?.message || "Failed to load meetings" });
    }
}
/**
 * POST /api/meetings/upload
 * multipart/form-data, field name: "audio"
 */
async function uploadMeeting(req, res) {
    //@ts-ignore
    const file = req.file;
    if (!file) {
        return res.status(400).json({ success: false, message: "audio file is required (field name 'audio')" });
    }
    // Create a placeholder record immediately so the client can render a
    // "processing" state without holding the HTTP request open indefinitely
    // if the caller chose to poll instead of awaiting this response directly.
    const now = new Date();
    let meeting;
    try {
        meeting = await meeting_agent_1.MeetingModel.create({
            title: file.originalname.replace(/\.[^/.]+$/, "") || "Untitled meeting",
            date: formatDisplayDate(now),
            duration: "—",
            durationSeconds: 0,
            status: "processing",
            summary: "",
            actionItems: [],
            transcript: "",
            audioFileName: file.originalname,
        });
    }
    catch (err) {
        console.error("[meetingAgent.uploadMeeting] failed to create placeholder", err);
        return res.status(500).json({ success: false, message: "Failed to start processing" });
    }
    try {
        const { text: transcript, durationSeconds } = await transcribeAudio(file.buffer, file.originalname);
        const minutes = await generateMinutes(transcript);
        meeting.transcript = transcript;
        meeting.durationSeconds = durationSeconds;
        meeting.duration = formatDuration(durationSeconds);
        meeting.title = minutes.title?.trim() || meeting.title;
        meeting.summary = minutes.summary?.trim() || "";
        meeting.actionItems = (minutes.actionItems || []).slice(0, MAX_ACTION_ITEMS).map((i) => i.trim()).filter(Boolean);
        meeting.status = "ready";
        await meeting.save();
        return res.status(200).json({ success: true, meeting: toDTO(meeting) });
    }
    catch (err) {
        meeting.status = "failed";
        meeting.failureReason = err?.message || "Processing failed";
        await meeting.save().catch((saveErr) => console.error("[meetingAgent.uploadMeeting] failed to persist failure", saveErr));
        if (err instanceof GroqRateLimitError) {
            return handleRateLimit(res, err.rateLimit);
        }
        console.error("[meetingAgent.uploadMeeting]", err);
        return res.status(502).json({
            success: false,
            message: err?.message || "Failed to process meeting recording",
            meeting: toDTO(meeting),
        });
    }
}
/**
 * POST /api/meetings/:id/jira
 */
async function createJiraTickets(req, res) {
    try {
        const meeting = await meeting_agent_1.MeetingModel.findById(req.params.id);
        if (!meeting) {
            return res.status(404).json({ success: false, message: "Meeting not found" });
        }
        if (meeting.status !== "ready") {
            return res.status(409).json({ success: false, message: "Meeting is not ready yet" });
        }
        if (meeting.actionItems.length === 0) {
            return res.status(400).json({ success: false, message: "This meeting has no action items to convert" });
        }
        const llmResult = await generateTickets(meeting);
        const rawTickets = (llmResult.tickets || []).slice(0, MAX_ACTION_ITEMS);
        const tickets = [];
        for (let i = 0; i < rawTickets.length; i++) {
            const t = rawTickets[i];
            const summary = t.summary?.trim() || meeting.actionItems[i] || `Follow-up ${i + 1}`;
            const description = t.description?.trim() || "";
            const priority = normalizePriority(t.priority);
            let key;
            try {
                key = await tryCreateJiraTicket({ summary, description, priority });
            }
            catch (jiraErr) {
                console.warn("[meetingAgent.createJiraTickets] Jira API call failed:", jiraErr);
            }
            tickets.push({
                id: `tk-${meeting.id}-${i + 1}`,
                key,
                summary,
                description,
                priority,
                url: key && env_1.ENV.JIRA_BASE_URL ? `${env_1.ENV.JIRA_BASE_URL}/browse/${key}` : undefined,
            });
        }
        meeting.tickets = tickets;
        meeting.ticketsCreated = true;
        await meeting.save();
        return res.status(200).json({
            success: true,
            tickets,
            jiraLive: Boolean(env_1.ENV.JIRA_BASE_URL && env_1.ENV.JIRA_EMAIL && env_1.ENV.JIRA_API_TOKEN && env_1.ENV.JIRA_PROJECT_KEY),
            meeting: toDTO(meeting),
        });
    }
    catch (err) {
        if (err instanceof GroqRateLimitError) {
            return handleRateLimit(res, err.rateLimit);
        }
        console.error("[meetingAgent.createJiraTickets]", err);
        return res.status(502).json({ success: false, message: err?.message || "Failed to generate tickets" });
    }
}
/**
 * POST /api/meetings/:id/email
 */
async function emailMeetingSummary(req, res) {
    try {
        const meeting = await meeting_agent_1.MeetingModel.findById(req.params.id);
        if (!meeting) {
            return res.status(404).json({ success: false, message: "Meeting not found" });
        }
        if (meeting.status !== "ready") {
            return res.status(409).json({ success: false, message: "Meeting is not ready yet" });
        }
        const { subject, body } = await generateEmail(meeting);
        const composed = `Subject: ${subject}\n\n${body}`;
        let delivered = false;
        try {
            delivered = await trySendEmail(subject, body);
        }
        catch (mailErr) {
            console.warn("[meetingAgent.emailMeetingSummary] SMTP send failed:", mailErr);
        }
        meeting.emailSummary = composed;
        meeting.emailSent = delivered;
        await meeting.save();
        return res.status(200).json({
            success: true,
            emailSummary: composed,
            delivered,
            meeting: toDTO(meeting),
        });
    }
    catch (err) {
        if (err instanceof GroqRateLimitError) {
            return handleRateLimit(res, err.rateLimit);
        }
        console.error("[meetingAgent.emailMeetingSummary]", err);
        return res.status(502).json({ success: false, message: err?.message || "Failed to generate email summary" });
    }
}
