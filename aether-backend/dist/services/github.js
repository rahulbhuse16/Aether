"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubService = void 0;
const rest_1 = require("@octokit/rest");
const user_1 = require("../models/user");
// Keep the context sent to Groq bounded — long issue threads shouldn't
// blow up the prompt size or drown out the actual signal.
const MAX_BODY_CHARS = 2000;
const MAX_COMMENTS = 5;
const MAX_COMMENT_CHARS = 500;
const truncate = (text, max) => text.length > max ? `${text.slice(0, max)}… [truncated]` : text;
/**
 * "owner/repo#123" or "owner/repo" -> { owner, repo }. Falls back to a
 * bare repo name (no owner) only if that's truly all you have — GitHub's
 * API requires both.
 */
const parseRepoFullName = (repoFullName) => {
    const [owner, repo] = repoFullName.split("/");
    if (!owner || !repo)
        return null;
    return { owner, repo };
};
/* ------------------------------------------------------------------ */
/* GitHub API helpers for repo code context                            */
/* ------------------------------------------------------------------ */
const GITHUB_API = "https://api.github.com";
async function githubApiFetch(token, path) {
    const res = await fetch(`${GITHUB_API}${path}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
        },
    });
    if (!res.ok) {
        throw new Error(`GitHub API ${path}: ${res.status} ${res.statusText}`);
    }
    return res.json();
}
/** Directories / extensions that burn token budget with no useful signal. */
const SKIP_PATH_SEGMENTS = [
    "node_modules/", "dist/", "build/", ".next/", "coverage/", ".git/",
    "vendor/", "__pycache__/", ".cache/", ".vscode/", ".idea/",
];
const SKIP_EXTENSIONS = [
    ".lock", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
    ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".zip", ".tar",
    ".min.js", ".min.css", ".map", ".d.ts", ".patch",
];
function isSearchableFile(path) {
    const lower = path.toLowerCase();
    if (SKIP_PATH_SEGMENTS.some((seg) => lower.includes(seg)))
        return false;
    if (SKIP_EXTENSIONS.some((ext) => lower.endsWith(ext)))
        return false;
    if (lower.endsWith("package-lock.json") || lower.endsWith("yarn.lock") || lower.endsWith("pnpm-lock.yaml"))
        return false;
    return true;
}
/** High-value files that should always be included if they exist. */
const PRIORITY_FILES = new Set([
    "readme.md", "readme.rst", "readme.txt", "readme",
    "package.json", "tsconfig.json",
    ".env.example", "docker-compose.yml", "dockerfile",
]);
const STOPWORDS = new Set([
    "the", "is", "a", "an", "of", "to", "in", "on", "for", "and", "or",
    "how", "what", "where", "does", "do", "this", "that", "with", "are",
    "i", "you", "my", "me", "it", "can", "show", "find", "why", "when",
]);
function tokenizeQuery(text) {
    return Array.from(new Set(text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 1 && !STOPWORDS.has(t))));
}
function scoreFilePath(path, terms) {
    const lower = path.toLowerCase();
    const base = lower.split("/").pop() ?? lower;
    let score = 0;
    // Priority files always get a boost
    if (PRIORITY_FILES.has(base))
        score += 2;
    for (const term of terms) {
        if (base.includes(term))
            score += 3; // filename match — strongest signal
        else if (lower.includes(term))
            score += 1; // directory/path match — weaker
    }
    return score;
}
// Slack AI budget: fewer files, more chars per file than repo chat since
// we need the AI to deeply understand the code for issue/bug analysis.
const SLACK_MAX_CONTEXT_FILES = 10;
const SLACK_MAX_CHARS_PER_FILE = 4000;
const SLACK_MAX_TOTAL_CHARS = 28000; // ~7k tokens — fits within Groq's 128k context with room for prompts
/** Fetch the full recursive file tree for a repo. */
async function fetchRepoTree(token, repoFullName, branch) {
    const tree = await githubApiFetch(token, `/repos/${repoFullName}/git/trees/${branch}?recursive=1`);
    return tree.tree
        .filter((entry) => entry.type === "blob")
        .map((entry) => entry.path)
        .filter(isSearchableFile);
}
/** Fetch a single file's content (base64 decoded, truncated). */
async function fetchFileContent(token, repoFullName, path, branch, maxChars) {
    try {
        const file = await githubApiFetch(token, `/repos/${repoFullName}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${branch}`);
        if (!file.content || file.encoding !== "base64")
            return null;
        const decoded = Buffer.from(file.content, "base64").toString("utf-8");
        return decoded.slice(0, maxChars);
    }
    catch {
        return null; // one unreadable file shouldn't fail the whole request
    }
}
/**
 * -----------------------------------------------------------------------
 * getRepoCodeContext — the main function for Slack AI integration
 * -----------------------------------------------------------------------
 *
 * Given a user's GitHub token, their connected repo, and the Slack message,
 * fetches the repo's file tree, keyword-scores every file against the
 * user's message, and retrieves the content of the top-matching files.
 *
 * This gives Aether actual codebase awareness — it can reference real
 * file paths, function names, and code patterns instead of guessing.
 *
 * Token budget: ~28k chars (~7k tokens) total code context. This fits
 * comfortably within Groq's 128k context window alongside the system
 * prompt, project context, and the AI's response.
 */
async function getRepoCodeContext(githubToken, repoFullName, query) {
    try {
        // Get default branch
        const repoMeta = await githubApiFetch(githubToken, `/repos/${repoFullName}`);
        const branch = repoMeta.default_branch;
        // Fetch tree + README in parallel
        const [paths, readmeRes] = await Promise.all([
            fetchRepoTree(githubToken, repoFullName, branch),
            githubApiFetch(githubToken, `/repos/${repoFullName}/readme`).catch(() => null),
        ]);
        // Keyword-score every file against the user's message
        const terms = tokenizeQuery(query);
        const scored = paths
            .map((path) => ({ path, score: scoreFilePath(path, terms) }))
            .sort((a, b) => b.score - a.score);
        // Take top N files — include zero-score priority files too
        const toFetch = scored
            .filter((e) => e.score > 0)
            .slice(0, SLACK_MAX_CONTEXT_FILES);
        // If we have very few keyword matches, also add key structural files
        if (toFetch.length < 4) {
            const alreadyIncluded = new Set(toFetch.map((e) => e.path));
            for (const p of paths) {
                if (alreadyIncluded.has(p))
                    continue;
                const base = p.toLowerCase().split("/").pop() ?? "";
                if (PRIORITY_FILES.has(base) && toFetch.length < SLACK_MAX_CONTEXT_FILES) {
                    toFetch.push({ path: p, score: 1 });
                    alreadyIncluded.add(p);
                }
            }
        }
        // Fetch file contents in parallel, respecting total char budget
        const fileResults = await Promise.all(toFetch.map(async ({ path }) => {
            const content = await fetchFileContent(githubToken, repoFullName, path, branch, SLACK_MAX_CHARS_PER_FILE);
            return content ? { path, content } : null;
        }));
        let files = fileResults.filter((f) => f !== null);
        // Enforce total character budget
        let totalChars = 0;
        files = files.filter((f) => {
            if (totalChars + f.content.length > SLACK_MAX_TOTAL_CHARS)
                return false;
            totalChars += f.content.length;
            return true;
        });
        // Parse README
        let readmeExcerpt = null;
        if (readmeRes?.content) {
            readmeExcerpt = Buffer.from(readmeRes.content, "base64")
                .toString("utf-8")
                .slice(0, 1500);
        }
        return {
            repoFullName,
            branch,
            fileTree: paths,
            files,
            readmeExcerpt,
        };
    }
    catch (error) {
        console.error("getRepoCodeContext error:", error);
        return null;
    }
}
exports.githubService = {
    /**
     * Builds a compact plaintext summary of a GitHub issue — title, body,
     * labels, and the most recent comments — suitable for
     * groqService.analyzeGithubIssue. Returns null if the user isn't
     * connected, the repo can't be resolved, or the issue doesn't exist.
     */
    getIssueContext: async (userId, issueNumber, repoFullName) => {
        const user = await user_1.User.findById(userId);
        if (!user?.githubConnected || !user.githubAccessToken) {
            return null;
        }
        /**
         * TODO: IUser has no stored default repo. Until one is added
         * (e.g. `githubDefaultRepo: string` set when the user connects a
         * repo in Settings), a repo must be passed explicitly — e.g. by
         * having groqService.classifyMention also extract "owner/repo"
         * from the Slack message, or by prompting the user to specify one
         * when it's missing.
         */
        const resolvedRepo = repoFullName ?? user.githubDefaultRepo;
        if (!resolvedRepo) {
            return null;
        }
        const parsed = parseRepoFullName(resolvedRepo);
        if (!parsed) {
            return null;
        }
        const octokit = new rest_1.Octokit({ auth: user.githubAccessToken });
        try {
            const { data: issue } = await octokit.issues.get({
                owner: parsed.owner,
                repo: parsed.repo,
                issue_number: Number(issueNumber),
            });
            const { data: comments } = await octokit.issues.listComments({
                owner: parsed.owner,
                repo: parsed.repo,
                issue_number: Number(issueNumber),
                per_page: MAX_COMMENTS,
                sort: "created",
                direction: "desc",
            });
            const labels = (issue.labels || [])
                .map((label) => (typeof label === "string" ? label : label.name))
                .filter(Boolean)
                .join(", ");
            const commentsText = comments
                .slice(0, MAX_COMMENTS)
                .reverse()
                .map((c) => `- ${c.user?.login ?? "unknown"}: ${truncate(c.body ?? "", MAX_COMMENT_CHARS)}`)
                .join("\n");
            const context = [
                `Title: ${issue.title}`,
                `State: ${issue.state}`,
                labels ? `Labels: ${labels}` : null,
                `Description:\n${truncate(issue.body ?? "(no description)", MAX_BODY_CHARS)}`,
                commentsText ? `Recent comments:\n${commentsText}` : null,
            ]
                .filter(Boolean)
                .join("\n\n");
            return context;
        }
        catch (error) {
            if (error?.status === 404) {
                return null;
            }
            console.error("GitHub getIssueContext error:", error);
            throw error;
        }
    },
    /**
     * Returns the canonical GitHub URL for an issue — used when posting
     * the "Open GitHub" button alongside Aether's analysis in Slack.
     */
    getIssueUrl: (repoFullName, issueNumber) => {
        return `https://github.com/${repoFullName}/issues/${issueNumber}`;
    },
    /**
     * Lists repos the user's connected GitHub account has access to —
     * useful for a Settings picker to let them choose a default repo per
     * the TODO above, since none is currently stored on IUser.
     */
    listAccessibleRepos: async (userId) => {
        const user = await user_1.User.findById(userId);
        if (!user?.githubConnected || !user.githubAccessToken) {
            return [];
        }
        const octokit = new rest_1.Octokit({ auth: user.githubAccessToken });
        const { data } = await octokit.repos.listForAuthenticatedUser({
            per_page: 100,
            sort: "updated",
        });
        return data.map((repo) => ({
            fullName: repo.full_name,
            private: repo.private,
        }));
    },
    /**
     * Fetches repo code context for the Slack AI — the file tree,
     * keyword-matched file contents, and README. This is the core
     * function that gives Aether codebase awareness.
     *
     * Returns null if the user isn't GitHub-connected or the fetch fails.
     */
    getRepoCodeContext: async (userId, query, repoFullName) => {
        const user = await user_1.User.findById(userId);
        if (!user?.githubConnected || !user.githubAccessToken) {
            return null;
        }
        const resolvedRepo = repoFullName ?? user.githubDefaultRepo;
        if (!resolvedRepo)
            return null;
        return getRepoCodeContext(user.githubAccessToken, resolvedRepo, query);
    },
};
