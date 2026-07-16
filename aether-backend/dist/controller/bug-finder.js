"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeRepository = analyzeRepository;
exports.getReports = getReports;
exports.getReportById = getReportById;
exports.deleteReport = deleteReport;
const axios_1 = __importDefault(require("axios"));
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const user_1 = require("../models/user"); // adjust path to your actual User model
const bug_analysis_1 = require("../models/bug-analysis");
const env_1 = require("../config/env");
// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GITHUB_API = "https://api.github.com";
// Guardrails so we never blow the model's context window.
// NOTE: these defaults are sized for Groq's free "on_demand" tier, which as of
// writing caps llama-3.3-70b-versatile at 12,000 tokens/minute (prompt +
// completion combined). ~4 characters ≈ 1 token for English/code text, so
// keep (system prompt + file context + completion budget) comfortably under
// that. If you're on Dev Tier or a higher tier, raise these via env vars.
const MAX_FILES = Number(process.env.BUGFINDER_MAX_FILES) || 18;
const MAX_FILE_CHARS = Number(process.env.BUGFINDER_MAX_FILE_CHARS) || 2500; // per-file truncation
const MAX_TOTAL_CHARS = Number(process.env.BUGFINDER_MAX_TOTAL_CHARS) || 22000; // total repo context budget (~5.5k tokens)
// Consistency + rate-limit guardrails for the AI call itself
const GROQ_TEMPERATURE = 0.15; // low temperature — this is an analysis task, not creative writing
const GROQ_SEED = 42; // fixed seed so repeated runs on the same context are reproducible
const GROQ_MAX_RETRIES = 2; // retries on malformed JSON / rate-limit before giving up
const GROQ_COMPLETION_TOKENS = Number(process.env.GROQ_COMPLETION_TOKENS) || 3500;
const GROQ_SHRINK_FACTOR = 0.6; // how much we cut the context by on a 413 retry
const RELEVANT_EXTENSIONS = [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".json",
    ".env.example",
    ".prisma",
    ".sql",
    ".yml",
    ".yaml",
];
const IGNORED_PATH_SEGMENTS = [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "coverage",
    "public",
    "assets",
    "lock",
    ".lock",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
];
const SYSTEM_INSTRUCTION = `You are Aether BugFinder AI.
You are an elite Staff Software Engineer, Security Engineer, Performance Engineer, DevOps Engineer, Solution Architect, and Code Reviewer.
Your responsibility is to perform an enterprise-grade repository analysis.
Never behave like a chatbot.
Never explain programming concepts unless requested.
Your primary objective is finding bugs, architectural issues, security vulnerabilities, runtime crashes, scalability problems, maintainability issues, incorrect business logic, race conditions, memory leaks, API mistakes, database issues, concurrency problems, React mistakes, Node.js mistakes, TypeScript issues, performance bottlenecks and production risks.
Always assume this code is running in production.
You must inspect every provided file.
Cross-reference files before making conclusions.
Understand imports, exports, interfaces, types, database models, services, controllers, routes, middleware, utilities and component relationships.
Never review a file in isolation if another file provides required context.
Before reporting an issue verify:
- Is this actually a bug?
- Can this crash production?
- Is it reproducible?
- Is there enough evidence?
- Could this be intentional?
Never generate false positives.
If confidence is below 80%, classify the issue as "Needs Verification" in the category field.
Always prefer correctness over quantity.
Prioritize findings by severity: CRITICAL, HIGH, MEDIUM, LOW, INFO.
Check for: authentication vulnerabilities, authorization bypass, JWT issues, token leakage, password storage, secrets in source code, SQL injection, NoSQL injection, XSS, CSRF, SSRF, path traversal, command injection, race conditions, deadlocks, infinite loops, unhandled promise rejections, missing await, memory leaks, React rendering bugs, infinite re-render, incorrect dependency arrays, state synchronization issues, Redux mistakes, context misuse, hook violations, TypeScript typing issues, null reference, undefined access, optional chaining misuse, async mistakes, API contract mismatch, database consistency, transaction issues, caching mistakes, Redis misuse, N+1 queries, performance bottlenecks, large object allocations, circular dependencies, incorrect architecture, improper abstraction, code duplication, error handling, logging issues, monitoring issues, retry logic, timeout handling, file system issues, cloud storage issues, WebSocket issues, MongoDB/Mongoose mistakes, Express mistakes, security headers, rate limiting, input validation, output encoding.
Always suggest a production-ready fix. Never suggest pseudo-code. Fixes must follow the existing repository architecture.
Never invent files. Never invent functions. Only reference code that exists inside the repository context provided to you.

You must output STRICT JSON and nothing else, matching exactly this schema:
{
  "repositoryHealthScore": number,
  "summary": "string",
  "critical": number,
  "high": number,
  "medium": number,
  "low": number,
  "findings": [
    {
      "title": "string",
      "severity": "critical | high | medium | low | info",
      "confidence": number,
      "category": "string",
      "file": "string",
      "lineStart": number,
      "lineEnd": number,
      "description": "string",
      "rootCause": "string",
      "impact": "string",
      "fix": "string",
      "codeSnippet": "string",
      "relatedFiles": ["string"]
    }
  ]
}
Never output markdown. Never output explanations. Never output conversational text outside the JSON object. Return only valid JSON.
Every string value must be valid JSON (escape newlines as \\n, quotes as \\", etc). Do not include any keys other than the ones defined in the schema above. "critical", "high", "medium", and "low" must equal the count of findings you return with that exact severity. "summary" must always be a non-empty string, even if you found zero issues.`;
// -----------------------------------------------------------------------------
// Groq client
// -----------------------------------------------------------------------------
const groq = new groq_sdk_1.default({ apiKey: env_1.ENV.GROQ_API_KEY });
// -----------------------------------------------------------------------------
// Helpers: GitHub
// -----------------------------------------------------------------------------
function githubHeaders(token) {
    return {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    };
}
// Resolves a GitHub repository directly by its numeric repository id.
// Docs: GET /repositories/{repository_id}
async function fetchRepoById(repoId, token) {
    try {
        const { data } = await axios_1.default.get(`${GITHUB_API}/repositories/${repoId}`, {
            headers: githubHeaders(token),
        });
        return {
            owner: data.owner?.login,
            repo: data.name,
            defaultBranch: data.default_branch,
            htmlUrl: data.html_url,
        };
    }
    catch (err) {
        if (axios_1.default.isAxiosError(err) && err.response?.status === 404) {
            throw new Error("Repository not found or not accessible with the connected GitHub account");
        }
        throw err;
    }
}
async function fetchRepoTree(owner, repo, branch, token) {
    const { data } = await axios_1.default.get(`${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers: githubHeaders(token) });
    if (data.truncated) {
        // Repo is very large; we still proceed with what GitHub returned,
        // the relevance filter + MAX_FILES cap keeps the payload safe.
        console.warn(`[bugfinder] tree truncated for ${owner}/${repo}@${branch}`);
    }
    return data.tree;
}
function isRelevantFile(path) {
    const lower = path.toLowerCase();
    if (IGNORED_PATH_SEGMENTS.some((seg) => lower.includes(seg)))
        return false;
    return RELEVANT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
function pickFilesToAnalyze(tree, focusPath) {
    let blobs = tree.filter((e) => e.type === "blob" && isRelevantFile(e.path));
    if (focusPath) {
        const scoped = blobs.filter((e) => e.path.startsWith(focusPath));
        if (scoped.length > 0)
            blobs = scoped;
    }
    // Prioritize likely high-signal areas: controllers, routes, services,
    // models, middleware, hooks, slices - before generic files.
    const priorityHints = [
        "controller",
        "route",
        "service",
        "model",
        "middleware",
        "slice",
        "hook",
        "auth",
        "api",
    ];
    blobs.sort((a, b) => {
        const aScore = priorityHints.some((h) => a.path.toLowerCase().includes(h)) ? 0 : 1;
        const bScore = priorityHints.some((h) => b.path.toLowerCase().includes(h)) ? 0 : 1;
        if (aScore !== bScore)
            return aScore - bScore;
        return (a.size || 0) - (b.size || 0);
    });
    return blobs.slice(0, MAX_FILES);
}
async function fetchFileContent(owner, repo, path, branch, token) {
    try {
        const { data } = await axios_1.default.get(`${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${branch}`, { headers: githubHeaders(token) });
        if (!data.content || data.encoding !== "base64")
            return null;
        const decoded = Buffer.from(data.content, "base64").toString("utf-8");
        return decoded.length > MAX_FILE_CHARS
            ? decoded.slice(0, MAX_FILE_CHARS) + "\n/* ...truncated... */"
            : decoded;
    }
    catch (err) {
        console.warn(`[bugfinder] failed to fetch ${path}:`, err.message);
        return null;
    }
}
async function buildRepositoryContext(owner, repo, branch, token, focusPath) {
    const tree = await fetchRepoTree(owner, repo, branch, token);
    const candidates = pickFilesToAnalyze(tree, focusPath);
    const files = [];
    let totalChars = 0;
    let skipped = 0;
    for (const entry of candidates) {
        if (totalChars >= MAX_TOTAL_CHARS) {
            skipped += 1;
            continue;
        }
        const content = await fetchFileContent(owner, repo, entry.path, branch, token);
        if (content === null) {
            skipped += 1;
            continue;
        }
        totalChars += content.length;
        files.push({ path: entry.path, content });
    }
    return { files, filesAnalyzed: files.length, filesSkipped: skipped };
}
function formatContextForModel(files) {
    return files
        .map((f) => `// FILE: ${f.path}\n${f.content}\n// END FILE: ${f.path}`)
        .join("\n\n");
}
// -----------------------------------------------------------------------------
// Helpers: Groq (via groq-sdk)
// -----------------------------------------------------------------------------
/** Parses model output defensively — strips stray fences if the model adds them anyway. */
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
/** Structural check — makes sure the model actually followed the schema before we trust it. */
function isValidAiResponse(value) {
    return (!!value &&
        typeof value.repositoryHealthScore === "number" &&
        typeof value.summary === "string" &&
        value.summary.trim().length > 0 &&
        Array.isArray(value.findings) &&
        value.findings.every((f) => f &&
            typeof f.title === "string" &&
            typeof f.severity === "string" &&
            typeof f.file === "string" &&
            typeof f.description === "string"));
}
/** True for Groq's TPM/context-too-large rate-limit response (HTTP 413 / code "rate_limit_exceeded"). */
function isRequestTooLargeError(err) {
    const status = err?.status ?? err?.response?.status;
    const code = err?.error?.error?.code ?? err?.code;
    const message = err?.message || "";
    return (status === 413 ||
        code === "rate_limit_exceeded" ||
        /request too large|tokens per minute/i.test(message));
}
/**
 * Cuts down the "Repository context" portion of the prompt (the large part)
 * by `factor`, leaving the repo/branch/focus/stack-trace header lines intact.
 * Used when Groq rejects a request as too large for the current TPM budget.
 */
function shrinkPrompt(prompt, factor) {
    const marker = "\nRepository context (";
    const markerIndex = prompt.indexOf(marker);
    if (markerIndex === -1) {
        return prompt.slice(0, Math.floor(prompt.length * factor));
    }
    const header = prompt.slice(0, markerIndex);
    const contextSection = prompt.slice(markerIndex);
    const shrunkContext = contextSection.slice(0, Math.floor(contextSection.length * factor));
    return `${header}${shrunkContext}\n/* ...context truncated further to fit the token budget... */`;
}
/**
 * Calls Groq via the official groq-sdk client. Uses a low, fixed temperature
 * plus a fixed seed so repeated analyses of the same repo context stay
 * consistent, forced JSON response formatting, and a retry loop that:
 *   - re-prompts the model if it returns malformed/incomplete JSON, and
 *   - shrinks the context and retries if Groq rejects the request as too
 *     large for the account's tokens-per-minute limit (HTTP 413).
 */
async function callGroq(userPrompt) {
    if (!env_1.ENV.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is not configured on the server");
    }
    let currentPrompt = userPrompt;
    let lastError = null;
    for (let attempt = 1; attempt <= GROQ_MAX_RETRIES; attempt++) {
        try {
            const completion = await groq.chat.completions.create({
                model: GROQ_MODEL,
                temperature: GROQ_TEMPERATURE,
                seed: GROQ_SEED,
                max_tokens: GROQ_COMPLETION_TOKENS,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: SYSTEM_INSTRUCTION },
                    {
                        role: "user",
                        content: attempt === 1
                            ? currentPrompt
                            : `${currentPrompt}\n\nYour previous response was not valid JSON matching the required schema, or included an empty "summary". Return ONLY the raw JSON object this time — no markdown, no commentary, no missing/empty fields.`,
                    },
                ],
            });
            const raw = completion.choices[0]?.message?.content || "";
            const parsed = safeParseJson(raw);
            if (isValidAiResponse(parsed)) {
                return parsed;
            }
            lastError = new Error("Groq returned a response that did not match the expected schema");
        }
        catch (err) {
            lastError = err;
            if (isRequestTooLargeError(err)) {
                console.warn(`[bugfinder] Groq call attempt ${attempt} failed: request too large for the current TPM limit. Shrinking context and retrying.`);
                currentPrompt = shrinkPrompt(currentPrompt, GROQ_SHRINK_FACTOR);
                lastError = new Error("Repository context is too large for the current Groq plan's tokens-per-minute limit, even after truncation. " +
                    "Try a smaller focusPath, or raise BUGFINDER_MAX_TOTAL_CHARS / GROQ_COMPLETION_TOKENS after upgrading your Groq tier.");
                continue;
            }
            console.warn(`[bugfinder] Groq call attempt ${attempt} failed:`, lastError.message);
        }
    }
    throw lastError || new Error("Groq returned an empty or invalid response");
}
// -----------------------------------------------------------------------------
// Mapping: AI response -> frontend-compatible JSON
// -----------------------------------------------------------------------------
const VALID_SEVERITIES = ["critical", "high", "medium", "low", "info"];
function normalizeSeverity(value) {
    const lower = (value || "").toLowerCase().trim();
    return VALID_SEVERITIES.includes(lower) ? lower : "info";
}
function mapAiFindingToFinding(f) {
    return {
        title: f.title || "Untitled finding",
        severity: normalizeSeverity(f.severity),
        confidence: typeof f.confidence === "number" ? f.confidence : 0,
        category: f.category || "General",
        file: f.file || "unknown",
        lineStart: typeof f.lineStart === "number" ? f.lineStart : 0,
        lineEnd: typeof f.lineEnd === "number" ? f.lineEnd : 0,
        description: f.description || "",
        rootCause: f.rootCause || "",
        impact: f.impact || "",
        fix: f.fix || "",
        codeSnippet: f.codeSnippet || "",
        relatedFiles: Array.isArray(f.relatedFiles) ? f.relatedFiles : [],
    };
}
// Shape returned to the frontend. This mirrors the Mongoose document 1:1
// so the slice/service layer can map it directly without transformation.
function serializeReport(doc) {
    return {
        id: doc._id.toString(),
        repoUrl: doc.repoUrl,
        repoName: doc.repoName,
        owner: doc.owner,
        branch: doc.branch,
        focusPath: doc.focusPath,
        stackTraceContext: doc.stackTraceContext,
        repositoryHealthScore: doc.repositoryHealthScore,
        summary: doc.summary,
        critical: doc.critical,
        high: doc.high,
        medium: doc.medium,
        low: doc.low,
        findings: doc.findings.map((f) => ({
            id: f._id?.toString?.() ?? undefined,
            title: f.title,
            severity: f.severity,
            confidence: f.confidence,
            category: f.category,
            file: f.file,
            lineStart: f.lineStart,
            lineEnd: f.lineEnd,
            description: f.description,
            rootCause: f.rootCause,
            impact: f.impact,
            fix: f.fix,
            codeSnippet: f.codeSnippet,
            relatedFiles: f.relatedFiles,
        })),
        filesAnalyzed: doc.filesAnalyzed,
        filesSkipped: doc.filesSkipped,
        model: doc.model,
        status: doc.status,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}
// -----------------------------------------------------------------------------
// Controllers
// -----------------------------------------------------------------------------
async function analyzeRepository(req, res) {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const { repoId, branch, focusPath, stackTrace } = req.body;
        if (!repoId) {
            return res.status(400).json({ success: false, message: "repoId is required" });
        }
        const user = await user_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        if (!user.githubConnected || !user.githubAccessToken) {
            return res.status(400).json({
                success: false,
                message: "Connect your GitHub account before running an analysis",
            });
        }
        const token = user.githubAccessToken;
        let owner, repo, defaultBranch, htmlUrl;
        try {
            const repoInfo = await fetchRepoById(repoId, token);
            owner = repoInfo.owner;
            repo = repoInfo.repo;
            defaultBranch = repoInfo.defaultBranch;
            htmlUrl = repoInfo.htmlUrl;
        }
        catch (err) {
            return res.status(404).json({
                success: false,
                message: err.message || "Repository could not be resolved",
            });
        }
        const resolvedBranch = branch || defaultBranch;
        const { files, filesAnalyzed, filesSkipped } = await buildRepositoryContext(owner, repo, resolvedBranch, token, focusPath);
        if (files.length === 0) {
            return res.status(422).json({
                success: false,
                message: "No analyzable source files were found in this repository/path",
            });
        }
        const repoContext = formatContextForModel(files);
        const userPrompt = [
            `Repository: ${owner}/${repo}`,
            `Branch: ${resolvedBranch}`,
            focusPath ? `Focus path: ${focusPath}` : null,
            stackTrace ? `Additional context / stack trace to prioritize:\n${stackTrace}` : null,
            `\nRepository context (${filesAnalyzed} files):\n${repoContext}`,
        ]
            .filter(Boolean)
            .join("\n");
        let aiResult;
        try {
            aiResult = await callGroq(userPrompt);
        }
        catch (err) {
            const failureMessage = err.message || "AI analysis failed";
            const failed = await bug_analysis_1.BugAnalysis.create({
                user: userId,
                repoUrl: htmlUrl,
                repoName: repo,
                owner,
                branch: resolvedBranch,
                focusPath: focusPath || "",
                stackTraceContext: stackTrace || "",
                repositoryHealthScore: 0,
                // `summary` is required in the schema — an empty string fails that
                // validator, so a failed run must still carry a non-empty message.
                summary: `Analysis failed: ${failureMessage}`.slice(0, 2000),
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                findings: [],
                filesAnalyzed,
                filesSkipped,
                model: GROQ_MODEL,
                status: "failed",
                errorMessage: failureMessage,
            });
            return res.status(502).json({
                success: false,
                message: failureMessage,
                report: serializeReport(failed),
            });
        }
        const findings = (aiResult.findings || []).map(mapAiFindingToFinding);
        const counts = findings.reduce((acc, f) => {
            if (f.severity === "critical")
                acc.critical += 1;
            else if (f.severity === "high")
                acc.high += 1;
            else if (f.severity === "medium")
                acc.medium += 1;
            else if (f.severity === "low")
                acc.low += 1;
            return acc;
        }, { critical: 0, high: 0, medium: 0, low: 0 });
        const saved = await bug_analysis_1.BugAnalysis.create({
            user: userId,
            repoUrl: htmlUrl,
            repoName: repo,
            owner,
            branch: resolvedBranch,
            focusPath: focusPath || "",
            stackTraceContext: stackTrace || "",
            repositoryHealthScore: typeof aiResult.repositoryHealthScore === "number"
                ? aiResult.repositoryHealthScore
                : 0,
            summary: aiResult.summary?.trim() || "No summary was returned by the model.",
            critical: counts.critical,
            high: counts.high,
            medium: counts.medium,
            low: counts.low,
            findings,
            filesAnalyzed,
            filesSkipped,
            model: GROQ_MODEL,
            status: "completed",
        });
        return res.status(200).json({ success: true, report: serializeReport(saved) });
    }
    catch (err) {
        console.error("[bugfinder.analyzeRepository]", err);
        return res.status(500).json({
            success: false,
            message: err.message || "Repository analysis failed",
        });
    }
}
async function getReports(req, res) {
    try {
        const userId = req.params.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const reports = await bug_analysis_1.BugAnalysis.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(50);
        return res.status(200).json({
            success: true,
            reports: reports.map(serializeReport),
        });
    }
    catch (err) {
        console.error("[bugfinder.getReports]", err);
        return res.status(500).json({ success: false, message: "Failed to fetch reports" });
    }
}
async function getReportById(req, res) {
    try {
        const userId = req.query;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const report = await bug_analysis_1.BugAnalysis.findOne({ _id: req.params.id, user: userId });
        if (!report) {
            return res.status(404).json({ success: false, message: "Report not found" });
        }
        return res.status(200).json({ success: true, report: serializeReport(report) });
    }
    catch (err) {
        console.error("[bugfinder.getReportById]", err);
        return res.status(500).json({ success: false, message: "Failed to fetch report" });
    }
}
async function deleteReport(req, res) {
    try {
        const userId = req.query;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const deleted = await bug_analysis_1.BugAnalysis.findOneAndDelete({
            _id: req.params.id,
            user: userId,
        });
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Report not found" });
        }
        return res.status(200).json({ success: true, id: req.params.id });
    }
    catch (err) {
        console.error("[bugfinder.deleteReport]", err);
        return res.status(500).json({ success: false, message: "Failed to delete report" });
    }
}
