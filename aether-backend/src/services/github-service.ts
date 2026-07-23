import { Octokit } from "@octokit/rest";
import { User } from "../models/user";

// Keep the context sent to Groq bounded — long issue threads shouldn't
// blow up the prompt size or drown out the actual signal.
const MAX_BODY_CHARS = 2000;
const MAX_COMMENTS = 5;
const MAX_COMMENT_CHARS = 500;

const truncate = (text: string, max: number): string =>
    text.length > max ? `${text.slice(0, max)}… [truncated]` : text;

/* ------------------------------------------------------------------ */
/* Repo auto-detection                                                 */
/* ------------------------------------------------------------------ */

export interface RepoMatch {
    fullName: string;
    private: boolean;
}

/**
 * Resolves a repo the user typed in a Slack mention (or nothing at all)
 * against the repos their GitHub account actually has access to.
 *
 * Accepts, in order of preference:
 *   - "owner/repo" exact match
 *   - bare repo name exact match ("aether-backend")
 *   - fuzzy/partial match ("aether" matches "aether-backend")
 *   - no hint at all — only auto-picks if the user has exactly one repo
 *     connected; otherwise returns null so the caller can ask.
 */
async function resolveRepo(
    userId: string,
    hint: string | null | undefined
): Promise<string | null> {
    const repos = await githubService.listAccessibleRepos(userId);
    if (repos.length === 0) return null;

    if (!hint || !hint.trim()) {
        return repos.length === 1 ? repos[0].fullName : null;
    }

    const cleanHint = hint.trim().toLowerCase();

    const exactFullName = repos.find((r) => r.fullName.toLowerCase() === cleanHint);
    if (exactFullName) return exactFullName.fullName;

    const exactRepoName = repos.find(
        (r) => r.fullName.toLowerCase().split("/")[1] === cleanHint
    );
    if (exactRepoName) return exactRepoName.fullName;

    const fuzzy = repos.find((r) => {
        const name = r.fullName.toLowerCase().split("/")[1];
        return name.includes(cleanHint) || cleanHint.includes(name);
    });

    return fuzzy ? fuzzy.fullName : null;
}

/* ------------------------------------------------------------------ */
/* GitHub API helpers for repo code context                            */
/* ------------------------------------------------------------------ */

const GITHUB_API = "https://api.github.com";

async function githubApiFetch(token: string, path: string): Promise<any> {
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

function isSearchableFile(path: string): boolean {
    const lower = path.toLowerCase();
    if (SKIP_PATH_SEGMENTS.some((seg) => lower.includes(seg))) return false;
    if (SKIP_EXTENSIONS.some((ext) => lower.endsWith(ext))) return false;
    if (lower.endsWith("package-lock.json") || lower.endsWith("yarn.lock") || lower.endsWith("pnpm-lock.yaml")) return false;
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

function tokenizeQuery(text: string): string[] {
    return Array.from(
        new Set(
            text
                .toLowerCase()
                .split(/[^a-z0-9]+/)
                .filter((t) => t.length > 1 && !STOPWORDS.has(t))
        )
    );
}

function scoreFilePath(path: string, terms: string[]): number {
    const lower = path.toLowerCase();
    const base = lower.split("/").pop() ?? lower;
    let score = 0;

    if (PRIORITY_FILES.has(base)) score += 2;

    for (const term of terms) {
        if (base.includes(term)) score += 3;
        else if (lower.includes(term)) score += 1;
    }
    return score;
}

export interface RepoCodeFile {
    path: string;
    content: string;
}

export interface RepoCodeContext {
    repoFullName: string;
    branch: string;
    fileTree: string[];
    files: RepoCodeFile[];
    readmeExcerpt: string | null;
}

// Slack AI budget: fewer files, more chars per file than repo chat since
// we need the AI to deeply understand the code for issue/bug analysis.
const SLACK_MAX_CONTEXT_FILES = 10;
const SLACK_MAX_CHARS_PER_FILE = 4000;
const SLACK_MAX_TOTAL_CHARS = 28000; // ~7k tokens — fits within Groq's 128k context with room for prompts

async function fetchRepoTree(token: string, repoFullName: string, branch: string): Promise<string[]> {
    const tree = await githubApiFetch(
        token,
        `/repos/${repoFullName}/git/trees/${branch}?recursive=1`
    );
    return ((tree as any).tree as any[])
        .filter((entry: any) => entry.type === "blob")
        .map((entry: any) => entry.path as string)
        .filter(isSearchableFile);
}

async function fetchFileContent(
    token: string,
    repoFullName: string,
    path: string,
    branch: string,
    maxChars: number
): Promise<string | null> {
    try {
        const file = await githubApiFetch(
            token,
            `/repos/${repoFullName}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${branch}`
        );
        if (!file.content || file.encoding !== "base64") return null;
        const decoded = Buffer.from(file.content, "base64").toString("utf-8");
        return decoded.slice(0, maxChars);
    } catch {
        return null; // one unreadable file shouldn't fail the whole request
    }
}

/**
 * Given a user's GitHub token, their resolved repo, and a query (issue
 * text, error message, or question), fetches the repo's file tree,
 * keyword-scores every file against the query, and retrieves the content
 * of the top-matching files. This is what gives Aether real codebase
 * awareness instead of generic advice.
 */
async function getRepoCodeContextInternal(
    githubToken: string,
    repoFullName: string,
    query: string
): Promise<RepoCodeContext | null> {
    try {
        const repoMeta = await githubApiFetch(githubToken, `/repos/${repoFullName}`);
        const branch = repoMeta.default_branch as string;

        const [paths, readmeRes] = await Promise.all([
            fetchRepoTree(githubToken, repoFullName, branch),
            githubApiFetch(githubToken, `/repos/${repoFullName}/readme`).catch(() => null),
        ]);

        const terms = tokenizeQuery(query);
        const scored = paths
            .map((path) => ({ path, score: scoreFilePath(path, terms) }))
            .sort((a, b) => b.score - a.score);

        const toFetch = scored
            .filter((e) => e.score > 0)
            .slice(0, SLACK_MAX_CONTEXT_FILES);

        if (toFetch.length < 4) {
            const alreadyIncluded = new Set(toFetch.map((e) => e.path));
            for (const p of paths) {
                if (alreadyIncluded.has(p)) continue;
                const base = p.toLowerCase().split("/").pop() ?? "";
                if (PRIORITY_FILES.has(base) && toFetch.length < SLACK_MAX_CONTEXT_FILES) {
                    toFetch.push({ path: p, score: 1 });
                    alreadyIncluded.add(p);
                }
            }
        }

        const fileResults = await Promise.all(
            toFetch.map(async ({ path }) => {
                const content = await fetchFileContent(
                    githubToken, repoFullName, path, branch, SLACK_MAX_CHARS_PER_FILE
                );
                return content ? { path, content } : null;
            })
        );

        let files = fileResults.filter((f): f is RepoCodeFile => f !== null);

        let totalChars = 0;
        files = files.filter((f) => {
            if (totalChars + f.content.length > SLACK_MAX_TOTAL_CHARS) return false;
            totalChars += f.content.length;
            return true;
        });

        let readmeExcerpt: string | null = null;
        if (readmeRes?.content) {
            readmeExcerpt = Buffer.from(readmeRes.content, "base64")
                .toString("utf-8")
                .slice(0, 1500);
        }

        return { repoFullName, branch, fileTree: paths, files, readmeExcerpt };
    } catch (error) {
        console.error("getRepoCodeContext error:", error);
        return null;
    }
}

export const githubService = {
    /**
     * Resolves a Slack-mentioned repo hint (or nothing) against the
     * user's actual connected repos. See resolveRepo() above for the
     * matching rules. Returns null when nothing could be confidently
     * resolved — callers should ask the user to specify a repo in that
     * case rather than guessing.
     */
    resolveRepo,

    /**
     * Builds a compact plaintext summary of a GitHub issue — title, body,
     * labels, and the most recent comments — suitable for
     * groqService.analyzeGithubIssue. `repoFullName` should already be
     * resolved via resolveRepo(); if omitted, this tries to resolve it
     * itself (only succeeds when the user has exactly one repo connected).
     */
    getIssueContext: async (
        userId: string,
        issueNumber: string,
        repoFullName?: string | null
    ): Promise<string | null> => {
        const user = await User.findById(userId);

        if (!user?.githubConnected || !user.githubAccessToken) {
            return null;
        }

        const resolved = repoFullName ?? (await resolveRepo(userId, null));
        if (!resolved) return null;

        const octokit = new Octokit({ auth: user.githubAccessToken });
        const [owner, repo] = resolved.split("/");

        try {
            const { data: issue } = await octokit.issues.get({
                owner,
                repo,
                issue_number: Number(issueNumber),
            });

            const { data: comments } = await octokit.issues.listComments({
                owner,
                repo,
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
                .map(
                    (c) =>
                        `- ${c.user?.login ?? "unknown"}: ${truncate(c.body ?? "", MAX_COMMENT_CHARS)}`
                )
                .join("\n");

            const context = [
                `Repository: ${resolved}`,
                `Title: ${issue.title}`,
                `State: ${issue.state}`,
                labels ? `Labels: ${labels}` : null,
                `Description:\n${truncate(issue.body ?? "(no description)", MAX_BODY_CHARS)}`,
                commentsText ? `Recent comments:\n${commentsText}` : null,
            ]
                .filter(Boolean)
                .join("\n\n");

            return context;
        } catch (error: any) {
            if (error?.status === 404) {
                return null;
            }
            console.error("GitHub getIssueContext error:", error);
            throw error;
        }
    },

    getIssueUrl: (repoFullName: string, issueNumber: string): string => {
        return `https://github.com/${repoFullName}/issues/${issueNumber}`;
    },

    /**
     * Lists repos the user's connected GitHub account has access to —
     * this is also what backs resolveRepo()'s matching.
     */
    listAccessibleRepos: async (userId: string): Promise<RepoMatch[]> => {
        const user = await User.findById(userId);

        if (!user?.githubConnected || !user.githubAccessToken) {
            return [];
        }

        const octokit = new Octokit({ auth: user.githubAccessToken });

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
     * Convenience wrapper for prompting the user to pick a repo when
     * resolveRepo() can't confidently pick one on its own.
     */
    listRepoNames: async (userId: string): Promise<string[]> => {
        const repos = await githubService.listAccessibleRepos(userId);
        return repos.map((r) => r.fullName);
    },

    /**
     * Fetches repo code context — file tree, keyword-matched file
     * contents, and README — for grounding Aether's responses in the
     * user's actual codebase. `repoFullName` should already be resolved
     * via resolveRepo(); if omitted, this tries to resolve it itself.
     */
    getRepoCodeContext: async (
        userId: string,
        query: string,
        repoFullName?: string | null
    ): Promise<RepoCodeContext | null> => {
        const user = await User.findById(userId);

        if (!user?.githubConnected || !user.githubAccessToken) {
            return null;
        }

        const resolved = repoFullName ?? (await resolveRepo(userId, null));
        if (!resolved) return null;

        return getRepoCodeContextInternal(user.githubAccessToken, resolved, query);
    },
};