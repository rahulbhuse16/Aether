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
//     yesterday: string,
//     prediction: { title, description, estimatedMinutes, severity },
//     tasks: Task[]   // matches tasksSlice's Task exactly — dispatch straight in
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDailyDigest = getDailyDigest;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const groq = new groq_sdk_1.default({ apiKey: process.env.GROQ_API_KEY });
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GITHUB_API = "https://api.github.com";
/**
 * System instruction for the digest agent.
 *
 * Scoped deliberately narrow — yesterday + one risk prediction, nothing
 * else. The model is NOT asked to produce tasks; a smaller, single-purpose
 * output is what actually improves consistency, more than any amount of
 * extra prompt instruction would. Everything below still applies to make
 * that one output reliable:
 * - Forces JSON-only output with an exact schema, so the frontend never
 *   has to defensively parse free text.
 * - Explicitly forbids inventing facts not present in the input — the
 *   single biggest cause of "AI looks inaccurate" is confident-sounding
 *   fabricated specifics, so it's stated twice: schema comments + hard rules.
 * - Gives an explicit escape hatch ("No risks detected") instead of
 *   pressuring the model to always find something alarming.
 * - Tone is anchored concretely ("senior engineer handoff note") rather
 *   than vaguely ("professional tone"), which produces far more
 *   consistent phrasing across repeated calls.
 */
const DIGEST_SYSTEM_PROMPT = `You are Aether's daily engineering digest agent. You analyze a single GitHub repository's recent activity (commits and closed issues/PRs from the last 24 hours, given to you as JSON) and produce a short daily briefing for the engineer opening their dashboard.

Respond with ONLY a single JSON object — no markdown, no code fences, no commentary before or after. The JSON must match exactly this shape:

{
  "yesterday": string,
  "prediction": {
    "title": string,
    "description": string,
    "estimatedMinutes": number,
    "severity": "low" | "medium" | "high"
  }
}

Field rules:
- "yesterday": one sentence, past tense, summarizing what was actually completed. Cite specific counts/commit messages/issue titles from the input data. Max 160 characters.
- "prediction.title": 3-6 words, present tense, names a specific risk visible in the input (e.g. recurring fix commits, a reverted commit, an issue reopened). If there is no real signal of risk, use exactly "No risks detected".
- "prediction.description": one sentence — what the risk is, why (grounded in the input), and a concrete suggested fix. Max 200 characters. If there's no risk, briefly say why things look stable.
- "prediction.estimatedMinutes": realistic integer effort estimate for the suggested fix, 5-180. Use 0 if there's no risk.
- "prediction.severity": "high" only for signals suggesting an outage or data issue is likely soon, "medium" for real but non-urgent risk, "low" for no risk or minor cleanup.

Hard rules:
- Only reference facts present in the input data. Never invent a metric, commit message, or issue title that isn't there.
- If there isn't enough signal for a confident prediction, say so via "No risks detected" rather than inventing one.
- Never use hedging language ("might", "could possibly") in "yesterday" — it already happened, state it plainly.
- Tone: write the way a sharp, terse senior engineer would write a one-line handoff note. No marketing language, no exclamation points, no emoji.
- Output valid JSON only. Do not wrap it in triple backticks or add any surrounding text.`;
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
function isValidOutput(x) {
    return (typeof x?.yesterday === "string" &&
        x.yesterday.length > 0 &&
        typeof x?.prediction?.title === "string" &&
        typeof x?.prediction?.description === "string" &&
        ["low", "medium", "high"].includes(x?.prediction?.severity));
}
async function callDigestModel(signals) {
    let lastError;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const completion = await groq.chat.completions.create({
                model: GROQ_MODEL,
                temperature: 0.2, // lower than a general-purpose call — this output
                // needs to be consistent day over day for the same kind of input,
                // not creative.
                response_format: { type: "json_object" },
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
                throw new Error("Digest response missing required fields");
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
