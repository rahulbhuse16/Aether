"use strict";
// Path: src/controllers/repoChatController.ts
//
// Backend for RepositoryChat.tsx. Replaces MOCK_RESPONSES with an actual
// (lightweight) retrieval step over the real, live GitHub repo, followed
// by one grounded AI call — same discipline as digestController.ts and
// onboardingController.ts: narrow system prompt, JSON-only output, hard
// rules against inventing facts, and a post-hoc filter that drops any
// citation the model claims that isn't actually in what we gave it.
//
// This is retrieval WITHOUT a vector store/embeddings index — there isn't
// one yet (indexing today only produces the onboarding summary, not
// stored embeddings). Retrieval here is keyword scoring over the repo's
// file tree, followed by fetching the actual content of the best-matching
// files fresh from GitHub on every message. That's enough for "where is
// X implemented" / "how does Y work" style questions and is honest about
// its limits (see the system prompt's fallback rule). If/when a real
// embeddings index exists, only gatherChatContext() needs to change —
// the model call and response contract stay the same.
//
// Requires: npm install groq-sdk
// Env: GROQ_API_KEY
//
// Assumptions (same as onboardingController.ts):
// - Auth middleware attaches `req.user = { id: string }`.
// - "../models/User" has `githubAccessToken` (select: false).
// - "../models/Project" is the schema you shared: githubRepoId, owner,
//   name, repo, openTasks, lastActivity, githubUpdatedAt, description,
//   stack, setupComplexity.
//
// Request:
//   POST /api/v1/repochat/message
//   body: {
//     projectId: string,
//     message: string,
//     history?: { role: "user" | "assistant"; content: string }[]
//   }
//
// Response (matches ChatMessage in chatSlice, plus `sources`):
//   {
//     message: {
//       id: string,
//       role: "assistant",
//       content: string,      // markdown — may contain ```lang fenced code
//       timestamp: string,    // "HH:MM"
//       sources: string[]     // exact file paths cited, e.g. "src/auth/LoginPage.tsx"
//     }
//   }
//
// NOTE: ChatMessage in ../types currently doesn't declare `sources`. Add
// `sources?: string[]` to it so the frontend can type the field instead
// of casting.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRepoChatMessage = sendRepoChatMessage;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const env_1 = require("../config/env");
const project_1 = require("../models/project");
const user_1 = require("../models/user");
const groq = new groq_sdk_1.default({ apiKey: env_1.ENV.GROQ_API_KEY });
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GITHUB_API = "https://api.github.com";
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
// Paths under these are near-never useful context and burn retrieval
// budget (deps, build output, lockfiles, binary assets).
const SKIP_PATH_SEGMENTS = [
    "node_modules/",
    "dist/",
    "build/",
    ".next/",
    "coverage/",
    ".git/",
    "vendor/",
];
const SKIP_EXTENSIONS = [
    ".lock",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".mp4",
    ".zip",
    ".min.js",
    ".map",
];
function isSearchableFile(path) {
    const lower = path.toLowerCase();
    if (SKIP_PATH_SEGMENTS.some((seg) => lower.includes(seg)))
        return false;
    if (SKIP_EXTENSIONS.some((ext) => lower.endsWith(ext)))
        return false;
    if (lower.endsWith("package-lock.json") || lower.endsWith("yarn.lock"))
        return false;
    return true;
}
const STOPWORDS = new Set([
    "the", "is", "a", "an", "of", "to", "in", "on", "for", "and", "or",
    "how", "what", "where", "does", "do", "this", "that", "with", "are",
    "i", "you", "my", "me", "it", "can", "show", "find",
]);
function tokenizeQuery(text) {
    return Array.from(new Set(text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 2 && !STOPWORDS.has(t))));
}
function scoreFilePath(path, terms) {
    const lower = path.toLowerCase();
    const base = lower.split("/").pop() ?? lower;
    let score = 0;
    for (const term of terms) {
        if (base.includes(term))
            score += 3; // filename match is a strong signal
        else if (lower.includes(term))
            score += 1; // directory/path match, weaker
    }
    return score;
}
const MAX_CONTEXT_FILES = 6;
const MAX_CHARS_PER_FILE = 2200;
async function fetchRepoTreePaths(token, repoFullName, branch) {
    const tree = await githubFetch(token, `/repos/${repoFullName}/git/trees/${branch}?recursive=1`);
    return tree.tree
        .filter((entry) => entry.type === "blob")
        .map((entry) => entry.path)
        .filter(isSearchableFile);
}
async function fetchFileContent(token, repoFullName, path, branch) {
    try {
        const file = await githubFetch(token, `/repos/${repoFullName}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${branch}`);
        if (!file.content || file.encoding !== "base64")
            return null;
        const decoded = Buffer.from(file.content, "base64").toString("utf-8");
        return decoded.slice(0, MAX_CHARS_PER_FILE);
    }
    catch {
        return null; // one unreadable file shouldn't fail the whole request
    }
}
/**
 * Keyword-scored retrieval over the live repo tree, fetched fresh every
 * message. No embeddings, no vector store, no caching of file content —
 * simple, honest, and self-correcting the moment the repo changes.
 */
async function gatherChatContext(token, repoFullName, branch, query) {
    const [paths, readmeRes] = await Promise.all([
        fetchRepoTreePaths(token, repoFullName, branch),
        githubFetch(token, `/repos/${repoFullName}/readme`).catch(() => null),
    ]);
    const terms = tokenizeQuery(query);
    const ranked = paths
        .map((path) => ({ path, score: scoreFilePath(path, terms) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_CONTEXT_FILES);
    const fileResults = await Promise.all(ranked.map(async ({ path }) => {
        const content = await fetchFileContent(token, repoFullName, path, branch);
        return content ? { path, content } : null;
    }));
    const files = fileResults.filter((f) => f !== null);
    let readmeExcerpt = null;
    if (readmeRes?.content) {
        readmeExcerpt = Buffer.from(readmeRes.content, "base64")
            .toString("utf-8")
            .slice(0, 1200);
    }
    return { repoFullName, branch, readmeExcerpt, files };
}
/**
 * System instruction for the repo chat agent.
 *
 * Same failure mode as every other agent in this app: a model that
 * answers confidently about code it was never shown. The context given
 * to it each turn is a small, keyword-retrieved slice of the repo, not
 * the whole thing — so the prompt has to make "I don't have that in what
 * was retrieved" a first-class, expected answer, not a last resort.
 */
const REPO_CHAT_SYSTEM_PROMPT = `You are Aether's repository chat agent — a pair-programming assistant answering questions about one specific GitHub repository. On every turn you are given: the repo name, a README excerpt, a small set of source files retrieved by keyword search against the user's question (path + content, possibly truncated), and recent conversation history. This is a PARTIAL slice of the repo, not the whole codebase.

Respond with ONLY a single JSON object — no markdown code fences around the JSON itself, no commentary before or after. The JSON must match exactly this shape:

{
  "answer": string,
  "citedFiles": string[]
}

Field rules:
- "answer": a clear, direct answer in markdown. Use fenced code blocks (\`\`\`language) when quoting or writing code, and inline backticks for file paths, function names, and identifiers. Reference specific files by their exact path when explaining where something lives. Keep it as short as fully answering the question allows — no padding, no restating the question.
- "citedFiles": the exact paths (copied verbatim from the provided context, or "README.md" if you used the README) of every file your answer actually draws on. Empty array if the answer doesn't rely on any specific provided file (e.g. a general or conversational question).

Hard rules:
- Only describe code, functions, files, or behavior that are actually present in the provided context or clearly stated in the conversation history. Never invent a function name, file path, line of code, or behavior that wasn't shown to you.
- If the provided context doesn't contain enough to answer confidently, say so plainly in "answer" — name what you looked for and didn't find, and suggest what the user could point you to (a specific file, folder, or more specific search term) instead of guessing. This is a normal, expected answer, not a failure.
- Never claim a file exists or was checked if it isn't in the provided context.
- If conversation history gives useful continuity (e.g. "that file" refers to something named earlier), use it — but ground any new factual claim in the current context, not memory of earlier turns alone.
- Tone: a sharp, senior engineer pairing with the person — direct, technically precise, no marketing language, no exclamation points, no emoji, no unnecessary hedging ("might", "could possibly") when the context is clear.
- Output valid JSON only. Do not wrap it in triple backticks or add any surrounding text.`;
function isValidChatOutput(x) {
    return (typeof x?.answer === "string" &&
        x.answer.trim().length > 0 &&
        Array.isArray(x?.citedFiles) &&
        x.citedFiles.every((f) => typeof f === "string"));
}
async function callChatModel(context, query, history) {
    let lastError;
    const userPayload = {
        repo: context.repoFullName,
        readmeExcerpt: context.readmeExcerpt,
        files: context.files, // [{ path, content }]
        conversationHistory: history.slice(-6),
        question: query,
    };
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const completion = await groq.chat.completions.create({
                model: GROQ_MODEL,
                temperature: 0.2,
                response_format: { type: "json_object" },
                max_tokens: 1200,
                messages: [
                    { role: "system", content: REPO_CHAT_SYSTEM_PROMPT },
                    { role: "user", content: JSON.stringify(userPayload) },
                ],
            });
            const raw = completion.choices[0]?.message?.content;
            if (!raw)
                throw new Error("Empty response from Groq");
            const parsed = JSON.parse(raw);
            if (!isValidChatOutput(parsed))
                throw new Error("Chat response missing required fields");
            // Trust but verify — same pattern as onboardingController's stack
            // filter. Drop any citation that isn't an actual path we retrieved,
            // rather than relying on the prompt alone to prevent fabrication.
            const validPaths = new Set(context.files.map((f) => f.path));
            if (context.readmeExcerpt)
                validPaths.add("README.md");
            parsed.citedFiles = parsed.citedFiles.filter((p) => validPaths.has(p));
            return parsed;
        }
        catch (err) {
            lastError = err;
        }
    }
    throw lastError instanceof Error ? lastError : new Error("Repo chat generation failed");
}
/* ---------------------------------------------------------------- */
/* Handler                                                            */
/* ---------------------------------------------------------------- */
const MAX_MESSAGE_LENGTH = 4000;
async function sendRepoChatMessage(req, res) {
    const { projectId, message, history, userId } = req.body;
    if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    if (!projectId || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ error: "Missing projectId or message" });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` });
    }
    try {
        const project = await project_1.Project.findOne({ _id: projectId, owner: userId });
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }
        const user = await user_1.User.findById(userId).select("+githubAccessToken");
        if (!user?.githubAccessToken) {
            return res.status(409).json({ error: "GitHub account not connected" });
        }
        const repoMeta = await githubFetch(user.githubAccessToken, `/repos/${project.repo}`);
        const branch = repoMeta.default_branch;
        const context = await gatherChatContext(user.githubAccessToken, project.repo || "", branch, message);
        const result = await callChatModel(context, message, history ?? []);
        res.json({
            message: {
                id: `m-${Date.now()}-ai`,
                role: "assistant",
                content: result.answer,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                sources: result.citedFiles,
            },
        });
    }
    catch (err) {
        console.error("sendRepoChatMessage failed:", err);
        res.status(502).json({ error: err.message });
    }
}
