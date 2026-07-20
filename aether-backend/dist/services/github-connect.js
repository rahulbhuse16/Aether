"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectGithubAccount = connectGithubAccount;
exports.ensureWebhook = ensureWebhook;
exports.removeWebhook = removeWebhook;
const rest_1 = require("@octokit/rest");
const project_1 = require("../models/project");
const user_1 = require("../models/user");
const helper_1 = require("../utils/helper");
const env_1 = require("../config/env");
const concurrency_1 = require("../utils/concurrency");
/**
 * Events we ask GitHub to send. Kept in one place so the connection service
 * and any re-registration logic can never drift out of sync with each other.
 */
const WEBHOOK_EVENTS = [
    "push",
    "issues",
    "pull_request",
    "issue_comment",
    "create",
    "delete",
    "release",
    "workflow_run",
];
function githubClient(accessToken) {
    return new rest_1.Octokit({ auth: accessToken });
}
/** GitHub paginates at 100/page — a user with >100 repos would silently lose the rest without this. */
async function fetchAllRepos(octokit) {
    const repos = [];
    let page = 1;
    // Hard cap of 1000 repos (10 pages) so a pathological account can't turn
    // this into an unbounded loop against the GitHub API.
    while (page <= 10) {
        const { data } = await octokit.repos.listForAuthenticatedUser({
            sort: "updated",
            per_page: 100,
            page,
        });
        repos.push(...data);
        if (data.length < 100)
            break;
        page += 1;
    }
    return repos;
}
/**
 * Links a GitHub account to a user: stores the access token, imports their
 * repos as Projects, and registers a webhook on each repo so future changes
 * sync in real time. Throws on genuine failures (bad userId/token, DB errors)
 * instead of silently returning — callers need to know if this failed.
 */
async function connectGithubAccount(userId, accessToken) {
    if (!userId || !accessToken) {
        throw new Error("connectGithubAccount requires both userId and accessToken");
    }
    const user = await user_1.User.findById(userId);
    if (!user) {
        throw new Error(`User ${userId} not found`);
    }
    user.githubAccessToken = accessToken;
    user.githubConnected = true;
    await user.save();
    const octokit = githubClient(accessToken);
    const repos = await fetchAllRepos(octokit);
    if (!repos.length) {
        return { connected: true, reposSynced: 0, webhooksRegistered: 0, webhooksFailed: [] };
    }
    // Upsert Projects first so every repo has a document to attach a webhook id to,
    // even if webhook registration for that repo fails below.
    const bulkOperations = repos.map((repo) => ({
        updateOne: {
            filter: { owner: user._id, githubRepoId: repo.id },
            update: {
                $set: {
                    owner: user._id,
                    githubRepoId: repo.id,
                    name: repo.name,
                    repo: repo.full_name,
                    openTasks: repo.open_issues_count,
                    lastActivity: (0, helper_1.formatTimeAgo)(repo.updated_at),
                    githubUpdatedAt: repo.updated_at,
                },
            },
            upsert: true,
        },
    }));
    //@ts-ignore
    await project_1.Project.bulkWrite(bulkOperations);
    const webhooksFailed = [];
    let webhooksRegistered = 0;
    // Bounded concurrency: register at most 5 webhooks at a time so a user with
    // 100 repos doesn't trip GitHub's secondary rate limit on connect.
    await (0, concurrency_1.mapWithConcurrency)(repos, 5, async (repo) => {
        try {
            const hookId = await ensureWebhook(octokit, repo.owner.login, repo.name);
            if (hookId) {
                await project_1.Project.updateOne({ owner: user._id, githubRepoId: repo.id }, { $set: { githubWebhookId: hookId } });
                webhooksRegistered += 1;
            }
        }
        catch (error) {
            webhooksFailed.push({
                repo: repo.full_name,
                error: error?.response?.data?.message ?? error?.message ?? "Unknown error",
            });
        }
    });
    if (webhooksFailed.length) {
        console.warn(`[connectGithubAccount] ${webhooksFailed.length}/${repos.length} webhook registrations failed for user ${userId}:`, webhooksFailed);
    }
    return {
        connected: true,
        reposSynced: repos.length,
        webhooksRegistered,
        webhooksFailed,
    };
}
/**
 * Idempotently ensures a webhook pointing at our callback URL exists on owner/repo.
 * Lists existing hooks first rather than relying on GitHub's 422 "already exists"
 * response — that approach costs an extra round trip on every single call (create
 * always fails first) and can't tell a genuine validation error apart from a
 * pre-existing hook. Returns null (without throwing) when the caller simply
 * lacks admin rights on the repo, since that's common for org repos and
 * shouldn't abort the whole connect flow.
 */
async function ensureWebhook(octokit, owner, repo) {
    try {
        const { data: existingHooks } = await octokit.repos.listWebhooks({ owner, repo, per_page: 100 });
        const existing = existingHooks.find((h) => h.config?.url === env_1.ENV.GITHUB_WEBHOOK_URL);
        if (existing)
            return existing.id;
        const { data: hook } = await octokit.repos.createWebhook({
            owner,
            repo,
            name: "web",
            active: true,
            events: [...WEBHOOK_EVENTS],
            config: {
                url: env_1.ENV.GITHUB_WEBHOOK_URL,
                content_type: "json",
                secret: env_1.ENV.GITHUB_WEBHOOK_SECRET,
                insecure_ssl: "0",
            },
        });
        return hook.id;
    }
    catch (error) {
        if (error?.status === 422) {
            // Race: something created a matching hook between our list + create calls above.
            const { data: hooks } = await octokit.repos.listWebhooks({ owner, repo, per_page: 100 });
            return hooks.find((h) => h.config?.url === env_1.ENV.GITHUB_WEBHOOK_URL)?.id ?? null;
        }
        if (error?.status === 403 || error?.status === 404) {
            // No admin access on this repo (common on org repos the user doesn't own) — skip, don't fail the batch.
            console.warn(`[ensureWebhook] Skipping ${owner}/${repo}: insufficient permissions (${error.status})`);
            return null;
        }
        throw error;
    }
}
/** Removes our webhook from a repo — call this when a user disconnects a Project. */
async function removeWebhook(accessToken, owner, repo, hookId) {
    const octokit = githubClient(accessToken);
    try {
        await octokit.repos.deleteWebhook({ owner, repo, hook_id: hookId });
    }
    catch (error) {
        if (error?.status === 404)
            return; // already gone — fine
        throw error;
    }
}
