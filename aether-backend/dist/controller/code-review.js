"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCodeReview = runCodeReview;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const env_1 = require("../config/env");
const project_1 = require("../models/project");
const user_1 = require("../models/user");
const axios_1 = __importDefault(require("axios"));
const groq = new groq_sdk_1.default({ apiKey: env_1.ENV.GROQ_API_KEY });
const GROQ_MODEL = "llama-3.3-70b-versatile";
// -----------------------------------------------------------------------------
// Token-budget guardrails
// -----------------------------------------------------------------------------
// Groq's on_demand tier caps llama-3.3-70b-versatile at a fixed number of
// tokens PER DAY (TPD), not just per minute. A single unreviewed PR with a
// few large diffs can burn a large chunk of that daily budget in one call.
// These caps keep each request small and predictable; raise them via env
// vars only once you've confirmed your Groq tier/budget can absorb it.
const MAX_FILES_PER_REVIEW = Number(process.env.CODEREVIEW_MAX_FILES) || 20;
const MAX_PATCH_CHARS_PER_FILE = Number(process.env.CODEREVIEW_MAX_PATCH_CHARS) || 1800;
const MAX_TOTAL_PATCH_CHARS = Number(process.env.CODEREVIEW_MAX_TOTAL_PATCH_CHARS) || 16000;
const GROQ_COMPLETION_TOKENS = Number(process.env.GROQ_REVIEW_COMPLETION_TOKENS) || 2048;
const GROQ_TEMPERATURE = 0.2;
const GROQ_MAX_TRANSIENT_RETRIES = 2; // only for genuinely transient errors, never for quota errors
// Files that are rarely worth spending review tokens on.
const IGNORED_FILE_PATTERNS = [
    /package-lock\.json$/,
    /yarn\.lock$/,
    /pnpm-lock\.yaml$/,
    /\.min\.(js|css)$/,
    /\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)$/,
    /\.(lock|snap)$/,
    /dist\//,
    /build\//,
    /\.generated\./,
];
const SYSTEM_PROMPT = `
You are Aether Code Review AI, a senior software engineer with expertise in TypeScript, JavaScript, React, React Native, Node.js, Express, Python, Java, Go, C#, databases, cloud infrastructure, security, and software architecture.

You are reviewing a Git Pull Request using Unified Diff (git patch) format.

Your responsibility is to review ONLY the changed lines shown in the diff.

Your objective is to identify REAL issues that should be fixed before merging.

Review for:

• Bugs
  - Incorrect logic
  - Null/undefined access
  - Race conditions
  - Async mistakes
  - Missing error handling
  - Resource leaks
  - Edge cases
  - Incorrect state updates
  - Breaking existing functionality

• Performance
  - Unnecessary renders
  - Expensive computations
  - Duplicate API calls
  - Memory leaks
  - O(n²) algorithms
  - Inefficient database queries
  - Missing memoization where appropriate

• Security
  - Hardcoded secrets
  - Authentication issues
  - Authorization flaws
  - Injection vulnerabilities
  - Unsafe HTML rendering
  - Sensitive data exposure
  - Insecure cryptography
  - Missing validation

• Maintainability
  - Dead code
  - Duplicate logic
  - Poor naming
  - Unreachable code
  - Overly complex implementations
  - Missing error handling
  - Code that is difficult to maintain

Instructions:

- Review ONLY the modified code.
- Do NOT comment on unchanged code.
- Do NOT invent issues.
- Do NOT make style suggestions unless they improve readability or maintainability.
- Ignore formatting and linting unless they hide a real problem.
- Every finding must be supported by evidence from the diff.
- Suggestions must be technically correct and safe.
- If uncertain, do not report the issue.
- Prefer fewer high-confidence findings over many speculative ones.
- Be concise: keep "message" and "suggestion" to 1-2 sentences each. Do not repeat the diff back in your answer.

For every issue include:

- line: line number in the diff
- category:
  - bug
  - performance
  - security
  - style
- severity:
  - low
  - medium
  - high
  - critical
- confidence:
  - low
  - medium
  - high
- message:
  A concise explanation describing the issue and why it matters.
- suggestion:
  A concrete fix or replacement.

Return ONLY valid JSON.

Schema:

{
  "findings": [
    {
      "line": 42,
      "category": "bug",
      "severity": "high",
      "confidence": "high",
      "message": "Possible null dereference because user may be undefined before accessing user.id.",
      "suggestion": "Check that user exists before accessing its properties."
    }
  ]
}

If there are no issues, return:

{
  "findings": []
}

Do not include markdown.
Do not include explanations outside the JSON.
Output must always be valid JSON.
`;
// -----------------------------------------------------------------------------
// Helpers: trimming the PR payload down to a safe token budget
// -----------------------------------------------------------------------------
function isIgnorableFile(filename) {
    return IGNORED_FILE_PATTERNS.some((pattern) => pattern.test(filename));
}
function truncatePatch(patch) {
    if (patch.length <= MAX_PATCH_CHARS_PER_FILE)
        return patch;
    return patch.slice(0, MAX_PATCH_CHARS_PER_FILE) + "\n/* ...diff truncated to fit token budget... */";
}
/**
 * Selects and trims PR files so the whole payload stays within a predictable
 * token budget: skip lock/binary/generated files, cap files reviewed, cap
 * per-file patch size, and cap the total combined patch size.
 */
function buildReviewPayload(files) {
    const skippedFiles = [];
    const reviewable = files.filter((f) => {
        if (!f.patch) {
            skippedFiles.push(f.filename);
            return false;
        }
        if (isIgnorableFile(f.filename)) {
            skippedFiles.push(f.filename);
            return false;
        }
        return true;
    });
    // Prioritize files with the most changes first — most likely to matter —
    // then cap the count so we don't just take whatever GitHub returned first.
    reviewable.sort((a, b) => (b.changes || 0) - (a.changes || 0));
    const selected = reviewable.slice(0, MAX_FILES_PER_REVIEW);
    skippedFiles.push(...reviewable.slice(MAX_FILES_PER_REVIEW).map((f) => f.filename));
    const formattedFiles = [];
    let totalChars = 0;
    for (const file of selected) {
        if (totalChars >= MAX_TOTAL_PATCH_CHARS) {
            skippedFiles.push(file.filename);
            continue;
        }
        const patch = truncatePatch(file.patch);
        totalChars += patch.length;
        formattedFiles.push({ filename: file.filename, status: file.status, patch });
    }
    return { formattedFiles, skippedFiles };
}
// -----------------------------------------------------------------------------
// Helpers: Groq response parsing/validation
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
function isValidLLMOutput(value) {
    return !!value && Array.isArray(value.findings);
}
/** Parses Groq's "please try again in 6h54m3.456s" duration into seconds. */
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
    return {
        isRateLimited: true,
        scope,
        retryAfterSeconds: parseRetryAfterSeconds(message),
        message,
    };
}
// -----------------------------------------------------------------------------
// Groq call
// -----------------------------------------------------------------------------
/**
 * Calls Groq for a single PR review. Daily quota exhaustion (TPD) is not
 * retried — the wait is hours long and another attempt would just burn
 * more of a budget that's already gone. Per-minute limits and other
 * transient errors get a couple of short retries.
 */
async function callGroqForReview(payload) {
    if (!env_1.ENV.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is not configured on the server");
    }
    let lastError = null;
    for (let attempt = 1; attempt <= GROQ_MAX_TRANSIENT_RETRIES; attempt++) {
        try {
            const completion = await groq.chat.completions.create({
                model: GROQ_MODEL,
                temperature: GROQ_TEMPERATURE,
                max_tokens: GROQ_COMPLETION_TOKENS,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: JSON.stringify(payload) },
                ],
            });
            const raw = completion.choices[0]?.message?.content;
            if (!raw) {
                lastError = new Error("Empty response from Groq");
                continue;
            }
            const parsed = safeParseJson(raw);
            if (isValidLLMOutput(parsed)) {
                return parsed;
            }
            lastError = new Error("Groq returned a response that did not match the expected schema");
        }
        catch (err) {
            const rateLimitInfo = inspectGroqError(err);
            // Daily quota exhausted — surface immediately, don't burn retries on it.
            if (rateLimitInfo.isRateLimited && rateLimitInfo.scope === "day") {
                throw Object.assign(new Error(rateLimitInfo.message), {
                    groqRateLimit: rateLimitInfo,
                });
            }
            // Per-minute limit — worth one short backoff before giving up.
            if (rateLimitInfo.isRateLimited && rateLimitInfo.scope === "minute") {
                lastError = Object.assign(new Error(rateLimitInfo.message), {
                    groqRateLimit: rateLimitInfo,
                });
                if (attempt < GROQ_MAX_TRANSIENT_RETRIES) {
                    const waitMs = Math.min((rateLimitInfo.retryAfterSeconds || 2) * 1000, 5000);
                    await new Promise((resolve) => setTimeout(resolve, waitMs));
                }
                continue;
            }
            lastError = err;
        }
    }
    if (lastError && lastError.groqRateLimit) {
        throw lastError;
    }
    throw lastError || new Error("Groq returned an empty or invalid response");
}
// -----------------------------------------------------------------------------
// Controller
// -----------------------------------------------------------------------------
async function runCodeReview(req, res) {
    const { projectId, prNumber, userId } = req.body;
    if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    if (!projectId || prNumber === undefined) {
        return res.status(400).json({ error: "Missing projectId or prNumber" });
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
        // Fetch PR changed files & diffs
        const { data: files } = await axios_1.default.get(`https://api.github.com/repos/${project.repo}/pulls/${prNumber}/files`, {
            headers: {
                Authorization: `Bearer ${user.githubAccessToken}`,
                Accept: "application/vnd.github+json",
            },
        });
        const { formattedFiles, skippedFiles } = buildReviewPayload(files);
        if (formattedFiles.length === 0) {
            return res.json({ findings: [], skippedFiles });
        }
        let result;
        try {
            result = await callGroqForReview({
                repo: project.repo,
                prNumber,
                files: formattedFiles,
            });
        }
        catch (err) {
            const rateLimit = err?.groqRateLimit;
            if (rateLimit?.isRateLimited) {
                if (rateLimit.retryAfterSeconds) {
                    res.set("Retry-After", String(rateLimit.retryAfterSeconds));
                }
                return res.status(429).json({
                    error: rateLimit.scope === "day"
                        ? "Daily AI review budget has been used up for today. Try again later."
                        : "AI review is temporarily rate-limited. Try again in a moment.",
                    scope: rateLimit.scope,
                    retryAfterSeconds: rateLimit.retryAfterSeconds,
                });
            }
            throw err;
        }
        // Normalize and add unique ids to findings
        const findings = (result.findings || []).map((finding, idx) => ({
            id: `f-${Date.now()}-${idx}`,
            line: Number(finding.line) || 1,
            category: ["bug", "performance", "security", "style"].includes(finding.category)
                ? finding.category
                : "style",
            severity: ["low", "medium", "high", "critical"].includes(finding.severity || "")
                ? finding.severity
                : "medium",
            confidence: ["low", "medium", "high"].includes(finding.confidence || "")
                ? finding.confidence
                : "medium",
            message: finding.message,
            suggestion: finding.suggestion,
        }));
        return res.json({ findings, skippedFiles });
    }
    catch (err) {
        console.error("runCodeReview failed:", err);
        return res.status(502).json({ error: err.message || "Failed to analyze PR" });
    }
}
