"use strict";
// Path: src/controllers/digestController.ts
//
// AI daily digest for Dashboard.tsx — self-contained, no database.
// Every signal comes straight from the GitHub REST API by repoId,
// fetched fresh on each request. Nothing is persisted server-side.
//
// Requires: npm install groq-sdk
// Env: GROQ_API_KEY
//
// Expects POST body: { githubAccessToken: string, repoId: string | number }
//
// Response shape:
//   {
//     yesterday: string,       // multi-line, bullet-pointed markdown ("• ...\n• ...")
//     prediction: { title, description, estimatedMinutes, severity },
//     tasks: Task[]             // matches tasksSlice's Task exactly — dispatch straight in
//   }
//
// Why tasks aren't AI-generated:
// Letting a model invent "today's tasks" is a second, unnecessary surface
// for hallucination on top of the prediction. GitHub already knows what's
// open — issues and PRs are mapped to Task objects directly, with zero AI
// involved, so they're always accurate. The one AI-influenced task (if
// any) is derived mechanically from the prediction below, not from a
// separate "list some tasks" prompt — one small, grounded model output
// instead of two loosely-grounded ones is what actually fixes the
// inconsistency, not more prompt tweaking.
//
// v2 change: "yesterday" and "prediction.description" are now multi-line,
// bullet-pointed briefs (6-8 lines each) instead of single sentences.
// This gives the model room to actually reason over the input — surfacing
// multiple commits/issues, calling out patterns, and separating "what
// happened" from "why it matters" — while every rule that keeps it
// grounded (no invented facts, strict schema, retry-once-then-fail) is
// unchanged. More lines is not "more freedom to hallucinate"; the hard
// rules below apply per-bullet, not just per-field.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDailyDigest = getDailyDigest;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const groq = new groq_sdk_1.default({ apiKey: process.env.GROQ_API_KEY });
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GITHUB_API = "https://api.github.com";
const MIN_BULLET_LINES = 6;
const MAX_BULLET_LINES = 8;
/**
 * System instruction for the digest agent.
 *
 * Scoped deliberately narrow — yesterday + one risk prediction, nothing
 * else. The model is NOT asked to produce tasks; a smaller, single-purpose
 * output is what actually improves consistency, more than any amount of
 * extra prompt instruction would. Everything below still applies to make
 * that output reliable, now expanded to a bulleted brief rather than a
 * single line:
 * - Forces JSON-only output with an exact schema, so the frontend never
 *   has to defensively parse free text.
 * - Explicitly forbids inventing facts not present in the input — the
 *   single biggest cause of "AI looks inaccurate" is confident-sounding
 *   fabricated specifics, so it's stated twice: schema comments + hard
 *   rules, and now again per-bullet.
 * - Requires each bullet to trace to something concrete in the input
 *   (a commit message, an issue title, a count) rather than general
 *   commentary, so a longer output doesn't dilute into filler.
 * - Gives an explicit escape hatch ("No risks detected") instead of
 *   pressuring the model to always find something alarming — and even
 *   in that case, the bullets explain *why* it's calling things stable.
 * - Tone is anchored concretely ("senior engineer handoff note") rather
 *   than vaguely ("professional tone"), which produces far more
 *   consistent phrasing across repeated calls.
 */
const DIGEST_SYSTEM_PROMPT = `You are Aether's daily engineering digest agent. You analyze a single GitHub repository's recent activity (commits and closed issues/PRs from the last 24 hours, given to you as JSON) and produce a short daily briefing for the engineer opening their dashboard.

Respond with ONLY a single JSON object — no markdown code fences, no commentary before or after. The JSON must match exactly this shape:

{
  "yesterday": string,
  "prediction": {
    "title": string,
    "description": string,
    "estimatedMinutes": number,
    "severity": "low" | "medium" | "high"
  }
}

FORMAT — "yesterday" and "prediction.description" are both bulleted briefs, not single sentences:
- Write them as ${MIN_BULLET_LINES}-${MAX_BULLET_LINES} lines, each line starting with "• " (bullet + one space), separated by a single "\\n" character inside the JSON string.
- Each bullet is one short, complete thought — no sub-bullets, no numbering, no blank lines between bullets.
- Every bullet must be traceable to something concretely present in the input (a specific commit message, issue/PR title, author, or count). Do not pad with generic filler ("the team made progress") just to hit the line count — if the input is thin, write fewer, denser bullets rather than inventing content, but never fewer than ${MIN_BULLET_LINES} unless the input genuinely has less than ${MIN_BULLET_LINES} distinct facts, in which case use as many as the input supports.
- Past tense throughout for "yesterday". Present tense, risk-focused, throughout "prediction.description".
- Keep each individual bullet line under 120 characters.

Field rules:
- "yesterday": ${MIN_BULLET_LINES}-${MAX_BULLET_LINES} bullets summarizing what was actually completed — group related commits, call out notable merges/closes, mention who did what when it's meaningful, and end with a one-line net summary bullet (e.g. total commits/issues closed). Cite specific commit messages, issue titles, and counts from the input data.
- "prediction.title": 3-6 words, present tense, names a specific risk visible in the input (e.g. recurring fix commits, a reverted commit, an issue reopened). If there is no real signal of risk, use exactly "No risks detected".
- "prediction.description": ${MIN_BULLET_LINES}-${MAX_BULLET_LINES} bullets that build the case for the risk step by step — the specific signal(s) observed, why they matter, any pattern across multiple commits/issues, the likely impact if ignored, and a concrete suggested fix as the final bullet. If there's no risk, use the same bullet format to explain what was checked and why things look stable (e.g. no reverts, no reopened issues, clean merge history).
- "prediction.estimatedMinutes": realistic integer effort estimate for the suggested fix, 5-180. Use 0 if there's no risk.
- "prediction.severity": "high" only for signals suggesting an outage or data issue is likely soon, "medium" for real but non-urgent risk, "low" for no risk or minor cleanup.

Hard rules:
- Only reference facts present in the input data. Never invent a metric, commit message, issue title, author, or count that isn't there.
- If there isn't enough signal for a confident prediction, say so via "No risks detected" rather than inventing one, and use the bullets to show what was checked.
- Never use hedging language ("might", "could possibly") in "yesterday" — it already happened, state it plainly.
- Tone: write the way a sharp, terse senior engineer would write a handoff note. No marketing language, no exclamation points, no emoji.
- Output valid JSON only, with real "\\n" line breaks inside the two string fields. Do not wrap it in triple backticks or add any surrounding text.`;
/* ---------------------------------------------------------------- */
/* GitHub                                                             */
/* ---------------------------------------------------------------- */
async function githubFetch(token, path) {
    const res = await fetch(`${GITHUB_API}${path}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
        },
    });
    if (!res.ok) {
        throw new Error(`GitHub API error on ${path}: ${res.status} ${res.statusText}`);
    }
    return res.json();
}
function priorityFromLabels(labels) {
    const names = labels.map((l) => l.name.toLowerCase());
    if (names.some((n) => /high|urgent|p0|p1/.test(n)))
        return "high";
    if (names.some((n) => /low|p3|minor/.test(n)))
        return "low";
    return "medium";
}
function statusFromLabelsAndAssignee(labels, assignee) {
    const names = labels.map((l) => l.name.toLowerCase());
    if (names.some((n) => /in.?progress|wip/.test(n)))
        return "in_progress";
    return assignee ? "in_progress" : "open";
}
function formatDueDate(dueOn) {
    if (!dueOn)
        return undefined;
    const due = new Date(dueOn);
    const today = new Date();
    if (due.toDateString() === today.toDateString())
        return "Today";
    return due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
/**
 * Deterministic — no AI. Every open issue/PR becomes a Task by direct
 * field mapping, so these are always accurate to what's actually in
 * GitHub right now, unlike anything passed through a model.
 */
function mapGithubItemsToTasks(items) {
    return items
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 6)
        .map((item) => {
        const isPR = Boolean(item.pull_request);
        return {
            id: isPR ? `pr-${item.number}` : `issue-${item.number}`,
            title: isPR ? `Review PR #${item.number}` : item.title,
            status: statusFromLabelsAndAssignee(item.labels ?? [], item.assignee),
            source: "github",
            priority: priorityFromLabels(item.labels ?? []),
            dueDate: formatDueDate(item.milestone?.due_on),
        };
    });
}
async function gatherGithubData(token, repoId) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    // GitHub's commits/issues endpoints only accept "owner/repo" paths, not
    // the numeric id directly — resolve that first via /repositories/{id}.
    const repo = await githubFetch(token, `/repositories/${repoId}`);
    const repoFullName = repo.full_name;
    const [commits, closedItems, openItems] = await Promise.all([
        githubFetch(token, `/repos/${repoFullName}/commits?since=${since}&per_page=30`),
        githubFetch(token, `/repos/${repoFullName}/issues?state=closed&since=${since}&per_page=30`),
        githubFetch(token, `/repos/${repoFullName}/issues?state=open&per_page=30`),
    ]);
    const signals = {
        repoName: repo.full_name,
        commitsLast24h: commits.map((c) => ({
            message: c.commit.message.split("\n")[0],
            author: c.commit.author?.name ?? "unknown",
        })),
        closedLast24h: closedItems.map((item) => ({
            title: item.title,
            type: item.pull_request ? "pull_request" : "issue",
        })),
        openIssueCount: repo.open_issues_count ?? 0,
    };
    const githubTasks = mapGithubItemsToTasks(openItems);
    return { signals, githubTasks };
}
/* ---------------------------------------------------------------- */
/* Model call — narrow scope, validated, retried once on bad output  */
/* ---------------------------------------------------------------- */
function clamp(n, min, max) {
    return Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
}
/**
 * Counts non-empty "• " bullet lines in a multi-line field.
 * Used for validation, not enforcement of exact wording.
 */
function bulletLineCount(text) {
    return text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("•") && line.length > 1).length;
}
/**
 * Loose on purpose: rejects obviously-broken output (missing fields,
 * empty strings, wrong severity enum, or fields that clearly aren't
 * bulleted at all) but doesn't hard-fail on line count being 5 or 9 —
 * thin input legitimately produces fewer bullets, and we'd rather ship
 * a slightly-short-but-accurate digest than retry into a fabricated one.
 */
function isValidOutput(x) {
    if (typeof x?.yesterday !== "string" || x.yesterday.trim().length === 0)
        return false;
    if (typeof x?.prediction?.title !== "string")
        return false;
    if (typeof x?.prediction?.description !== "string" || x.prediction.description.trim().length === 0)
        return false;
    if (!["low", "medium", "high"].includes(x?.prediction?.severity))
        return false;
    // Both fields should read as a bulleted brief, not a single sentence.
    if (bulletLineCount(x.yesterday) < 1)
        return false;
    if (bulletLineCount(x.prediction.description) < 1)
        return false;
    return true;
}
async function callDigestModel(signals) {
    let lastError;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const completion = await groq.chat.completions.create({
                model: GROQ_MODEL,
                temperature: 0.2, // lower than a general-purpose call — this output
                // needs to be consistent day over day for the same kind of input,
                // not creative. Longer output doesn't need a temperature bump;
                // the extra length comes from structure (bullets), not variety.
                response_format: { type: "json_object" },
                max_tokens: 900, // headroom for two 6-8 line bulleted fields, was
                // previously fine at the default for single-sentence output.
                messages: [
                    { role: "system", content: DIGEST_SYSTEM_PROMPT },
                    { role: "user", content: JSON.stringify(signals) },
                ],
            });
            const raw = completion.choices[0]?.message?.content;
            if (!raw)
                throw new Error("Empty response from Groq");
            const parsed = JSON.parse(raw);
            if (!isValidOutput(parsed))
                throw new Error("Digest response missing required fields or not bulleted");
            // Clamp instead of trust — a model that says estimatedMinutes: 500
            // or severity: "extreme" shouldn't be able to break the frontend.
            parsed.prediction.estimatedMinutes = clamp(parsed.prediction.estimatedMinutes, 0, 180);
            return parsed;
        }
        catch (err) {
            lastError = err;
        }
    }
    throw lastError instanceof Error ? lastError : new Error("Digest generation failed");
}
/**
 * Deterministic — no second AI call. If the model's prediction indicates
 * real risk, that IS the day's AI-sourced task; there's no separate
 * "ask the model for a task list" step to go inconsistent.
 */
function deriveAiTask(prediction) {
    if (prediction.severity === "low" || prediction.title === "No risks detected") {
        return null;
    }
    return {
        id: `ai-prediction-${Date.now()}`,
        title: prediction.title,
        status: "open",
        source: "ai",
        priority: prediction.severity === "high" ? "high" : "medium",
    };
}
/* ---------------------------------------------------------------- */
/* Handler                                                            */
/* ---------------------------------------------------------------- */
async function getDailyDigest(req, res) {
    const { githubAccessToken, repoId } = req.body;
    if (!githubAccessToken || !repoId) {
        return res.status(400).json({ error: "Missing githubAccessToken or repoId" });
    }
    try {
        const { signals, githubTasks } = await gatherGithubData(githubAccessToken, repoId);
        const modelOutput = await callDigestModel(signals);
        const aiTask = deriveAiTask(modelOutput.prediction);
        const tasks = aiTask ? [aiTask, ...githubTasks] : githubTasks;
        res.json({
            yesterday: modelOutput.yesterday,
            prediction: modelOutput.prediction,
            tasks,
        });
    }
    catch (err) {
        console.error("getDailyDigest failed:", err);
        res.status(502).json({ error: err.message });
    }
}
