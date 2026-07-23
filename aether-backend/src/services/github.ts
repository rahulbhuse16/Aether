import { Octokit } from "@octokit/rest";
import { User } from "../models/user";

// Keep the context sent to Groq bounded — long issue threads shouldn't
// blow up the prompt size or drown out the actual signal.
const MAX_BODY_CHARS = 2000;
const MAX_COMMENTS = 5;
const MAX_COMMENT_CHARS = 500;

export interface IssueContextResult {
    context: string;
    url: string;
    title: string;
}

const truncate = (text: string, max: number): string =>
    text.length > max ? `${text.slice(0, max)}… [truncated]` : text;

/**
 * "owner/repo#123" or "owner/repo" -> { owner, repo }. Falls back to a
 * bare repo name (no owner) only if that's truly all you have — GitHub's
 * API requires both.
 */
const parseRepoFullName = (repoFullName: string): { owner: string; repo: string } | null => {
    const [owner, repo] = repoFullName.split("/");
    if (!owner || !repo) return null;
    return { owner, repo };
};

export const githubService = {
    /**
     * Builds a compact plaintext summary of a GitHub issue — title, body,
     * labels, and the most recent comments — suitable for
     * groqService.analyzeGithubIssue. Returns null if the user isn't
     * connected, the repo can't be resolved, or the issue doesn't exist.
     */
    getIssueContext: async (
        userId: string,
        issueNumber: string,
        repoFullName?: string
    ): Promise<string | null> => {
        const user = await User.findById(userId);

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
        const resolvedRepo = repoFullName ?? (user as any).githubDefaultRepo;

        if (!resolvedRepo) {
            return null;
        }

        const parsed = parseRepoFullName(resolvedRepo);
        if (!parsed) {
            return null;
        }

        const octokit = new Octokit({ auth: user.githubAccessToken });

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
                .map(
                    (c) =>
                        `- ${c.user?.login ?? "unknown"}: ${truncate(c.body ?? "", MAX_COMMENT_CHARS)}`
                )
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
        } catch (error: any) {
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
    getIssueUrl: (repoFullName: string, issueNumber: string): string => {
        return `https://github.com/${repoFullName}/issues/${issueNumber}`;
    },

    /**
     * Lists repos the user's connected GitHub account has access to —
     * useful for a Settings picker to let them choose a default repo per
     * the TODO above, since none is currently stored on IUser.
     */
    listAccessibleRepos: async (
        userId: string
    ): Promise<{ fullName: string; private: boolean }[]> => {
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
};