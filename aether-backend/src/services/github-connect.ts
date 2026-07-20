import { Octokit } from "@octokit/rest";
import { Project } from "../models/project";
import { User } from "../models/user";
import { formatTimeAgo } from "../utils/helper";
import { ENV } from "../config/env";
import { mapWithConcurrency } from "../utils/concurrency";

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
] as const;

interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  open_issues_count: number;
  updated_at: string;
  owner: { login: string };
}

function githubClient(accessToken: string) {
  return new Octokit({ auth: accessToken });
}

/** GitHub paginates at 100/page — a user with >100 repos would silently lose the rest without this. */
async function fetchAllRepos(octokit: Octokit): Promise<GithubRepo[]> {
  const repos: GithubRepo[] = [];
  let page = 1;

  // Hard cap of 1000 repos (10 pages) so a pathological account can't turn
  // this into an unbounded loop against the GitHub API.
  while (page <= 10) {
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
      page,
    });
    repos.push(...(data as unknown as GithubRepo[]));
    if (data.length < 100) break;
    page += 1;
  }

  return repos;
}

export interface ConnectGithubResult {
  connected: boolean;
  reposSynced: number;
  webhooksRegistered: number;
  webhooksFailed: { repo: string; error: string }[];
}

/**
 * Links a GitHub account to a user: stores the access token, imports their
 * repos as Projects, and registers a webhook on each repo so future changes
 * sync in real time. Throws on genuine failures (bad userId/token, DB errors)
 * instead of silently returning — callers need to know if this failed.
 */
export async function connectGithubAccount(
  userId: string,
  accessToken: string
): Promise<ConnectGithubResult> {
  if (!userId || !accessToken) {
    throw new Error("connectGithubAccount requires both userId and accessToken");
  }

  const user = await User.findById(userId);
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
          lastActivity: formatTimeAgo(repo.updated_at),
          githubUpdatedAt: repo.updated_at,
        },
      },
      upsert: true,
    },
  }));
  //@ts-ignore
  await Project.bulkWrite(bulkOperations);

  const webhooksFailed: { repo: string; error: string }[] = [];
  let webhooksRegistered = 0;

  // Bounded concurrency: register at most 5 webhooks at a time so a user with
  // 100 repos doesn't trip GitHub's secondary rate limit on connect.
  await mapWithConcurrency(repos, 5, async (repo) => {
    try {
      const hookId = await ensureWebhook(octokit, repo.owner.login, repo.name);
      if (hookId) {
        await Project.updateOne(
          { owner: user._id, githubRepoId: repo.id },
          { $set: { githubWebhookId: hookId } }
        );
        webhooksRegistered += 1;
      }
    } catch (error: any) {
      webhooksFailed.push({
        repo: repo.full_name,
        error: error?.response?.data?.message ?? error?.message ?? "Unknown error",
      });
    }
  });

  if (webhooksFailed.length) {
    console.warn(
      `[connectGithubAccount] ${webhooksFailed.length}/${repos.length} webhook registrations failed for user ${userId}:`,
      webhooksFailed
    );
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
export async function ensureWebhook(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<number | null> {
  try {
    const { data: existingHooks } = await octokit.repos.listWebhooks({ owner, repo, per_page: 100 });
    const existing = existingHooks.find((h) => h.config?.url === ENV.GITHUB_WEBHOOK_URL);
    if (existing) return existing.id;

    const { data: hook } = await octokit.repos.createWebhook({
      owner,
      repo,
      name: "web",
      active: true,
      events: [...WEBHOOK_EVENTS],
      config: {
        url: ENV.GITHUB_WEBHOOK_URL,
        content_type: "json",
        secret: ENV.GITHUB_WEBHOOK_SECRET,
        insecure_ssl: "0",
      },
    });
    return hook.id;
  } catch (error: any) {
    if (error?.status === 422) {
      // Race: something created a matching hook between our list + create calls above.
      const { data: hooks } = await octokit.repos.listWebhooks({ owner, repo, per_page: 100 });
      return hooks.find((h) => h.config?.url === ENV.GITHUB_WEBHOOK_URL)?.id ?? null;
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
export async function removeWebhook(accessToken: string, owner: string, repo: string, hookId: number) {
  const octokit = githubClient(accessToken);
  try {
    await octokit.repos.deleteWebhook({ owner, repo, hook_id: hookId });
  } catch (error: any) {
    if (error?.status === 404) return; // already gone — fine
    throw error;
  }
}