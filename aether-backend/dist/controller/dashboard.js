"use strict";
// Path: src/controllers/digestController.ts
//
// AI daily digest for Dashboard.tsx — self-contained, no database.
// Every signal the model sees comes straight from the GitHub REST API,
// fetched fresh on each request using the caller's GitHub access token.
// Nothing is persisted or cached server-side.
//
// Requires: npm install groq-sdk
// Env: GROQ_API_KEY
//
// Expects POST body: { githubAccessToken: string, repoId: string | number }
// repoId is GitHub's numeric repository id (stable even if the repo is
// renamed or transferred, unlike "owner/repo"). It's resolved to a
// full_name via GET /repositories/{id} before the rest of the calls,
// since GitHub's commits/issues endpoints only accept owner/repo paths.
//
// The frontend should hold the GitHub token in memory from the Firebase
// GithubAuthProvider sign-in result and send it with this one request
// rather than persisting it anywhere.
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
 * Design notes:
 * - Forces JSON-only output with an exact schema, so the frontend never
 *   has to defensively parse free text.
 * - Explicitly forbids inventing numbers/facts not present in the input —
 *   the single biggest failure mode for "AI summary" features is
 *   confident-sounding fabricated specifics, so it's called out twice:
 *   once in the schema comments, once in the hard rules.
 * - Gives an explicit escape hatch ("No risks detected") instead of
 *   pressuring the model to always produce a dramatic prediction — that
 *   pressure is what causes hallucinated risks when nothing is wrong.
 * - Tone is anchored concretely ("senior engineer handoff note") rather
 *   than vaguely ("professional tone"), which produces far more
 *   consistent output style across calls.
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
- "prediction.title": 3-6 words, present tense, names a specific risk visible in the input (e.g. recurring fix commits, a reverted commit, an issue reopened). If there is no real signal of risk, use "No risks detected".
- "prediction.description": one sentence — what the risk is, why (grounded in the input), and a concrete suggested fix. Max 200 characters. If there's no risk, briefly say why things look stable.
- "prediction.estimatedMinutes": realistic integer effort estimate for the suggested fix, 5-180. Use 0 if there's no risk.
- "prediction.severity": "high" only for signals suggesting an outage or data issue is likely soon, "medium" for real but non-urgent risk, "low" for no risk or minor cleanup.

Hard rules:
- Only reference facts present in the input data. Never invent a metric, commit message, or issue title that isn't there.
- If there isn't enough signal for a confident prediction, say so via "No risks detected" rather than inventing one.
- Never use hedging language ("might", "could possibly") in "yesterday" — it already happened, state it plainly.
- Tone: write the way a sharp, terse senior engineer would write a one-line handoff note. No marketing language, no exclamation points, no emoji.
- Output valid JSON only. Do not wrap it in triple backticks or add any surrounding text.`;
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
async function gatherGithubSignals(token, repoId) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    // GitHub's commits/issues endpoints only accept "owner/repo" paths, not
    // the numeric id directly — resolve that first via /repositories/{id}.
    const repo = await githubFetch(token, `/repositories/${repoId}`);
    const repoFullName = repo.full_name;
    const [commits, closedItems] = await Promise.all([
        githubFetch(token, `/repos/${repoFullName}/commits?since=${since}&per_page=30`),
        githubFetch(token, `/repos/${repoFullName}/issues?state=closed&since=${since}&per_page=30`),
    ]);
    return {
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
}
async function getDailyDigest(req, res) {
    const { githubAccessToken, repoId } = req.body;
    if (!githubAccessToken || !repoId) {
        return res.status(400).json({ error: "Missing githubAccessToken or repoId" });
    }
    try {
        const signals = await gatherGithubSignals(githubAccessToken, repoId);
        const completion = await groq.chat.completions.create({
            model: GROQ_MODEL,
            temperature: 0.4,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: DIGEST_SYSTEM_PROMPT },
                { role: "user", content: JSON.stringify(signals) },
            ],
        });
        const raw = completion.choices[0]?.message?.content;
        if (!raw)
            throw new Error("Empty response from Groq");
        let digest;
        try {
            digest = JSON.parse(raw);
        }
        catch {
            throw new Error("Groq returned malformed JSON for the daily digest");
        }
        if (!digest.yesterday || !digest.prediction?.title) {
            throw new Error("Digest response missing required fields");
        }
        res.json(digest);
    }
    catch (err) {
        console.error("getDailyDigest failed:", err);
        res.status(502).json({ error: err.message });
    }
}
