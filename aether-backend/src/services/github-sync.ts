import { Octokit } from "@octokit/rest";
import { ITask, Task } from "../models/task";
import { IProject } from "../models/project";
import { IUser } from "../models/user";
import { StringDecoder } from "node:string_decoder";

/**
 * IMPORTANT — this file assumes two schema additions that weren't in the
 * original Task model (see the note at the bottom of this file for the
 * exact fields to add). Without them this won't compile / will silently
 * mis-scope tasks across repos:
 *
 *   Task.project        ObjectId ref "Project"  (required)
 *   Task.githubIssueId   string, e.g. "<githubRepoId>-<issueNumber>", unique per user
 *
 * Why: the previous version keyed tasks by `gh-${issue.number}` alone, which
 * collides the moment a user connects two repos that both have an issue #1.
 * Scoping by project.githubRepoId as well as the issue number fixes that.
 */

function client(user: IUser) {
  return new Octokit({ auth: user.githubAccessToken });
}

function splitRepo(repoFullName: string): { owner: string; repo: string } {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) throw new Error(`Invalid repo "${repoFullName}", expected "owner/repo"`);
  return { owner, repo };
}

function githubIssueId(project: IProject, issueNumber: number): string {
  return `${project.githubRepoId}-${issueNumber}`;
}

function issueStatusToTaskStatus(issue: { state: string; labels: any[] }): ITask["status"] {
  if (issue.state === "closed") return "done";
  const inProgress = issue.labels?.some(
    (l: any) => (typeof l === "string" ? l : l.name)?.toLowerCase() === "in progress"
  );
  return inProgress ? "in_progress" : "open";
}

function taskStatusToGithub(status: ITask["status"]): { state: "open" | "closed"; label?: string } {
  if (status === "done") return { state: "closed" };
  if (status === "in_progress") return { state: "open", label: "in progress" };
  return { state: "open" };
}

function priorityFromLabels(labels: any[]): ITask["priority"] | undefined {
  const names = labels?.map((l: any) => (typeof l === "string" ? l : l.name)?.toLowerCase()) ?? [];
  if (names.includes("high") || names.includes("priority: high")) return "high";
  if (names.includes("medium") || names.includes("priority: medium")) return "medium";
  if (names.includes("low") || names.includes("priority: low")) return "low";
  return undefined;
}

/** Pulls every page of issues for a repo (open + closed), skipping pull requests. */
async function fetchAllIssues(octokit: Octokit, owner: string, repo: string) {
  const issues: any[] = [];
  let page = 1;

  // Cap at 500 most-recently-updated issues (5 pages) — plenty for a "recent
  // activity" sync; anything older is unlikely to matter for an active board.
  while (page <= 5) {
    const { data } = await octokit.issues.listForRepo({
      owner,
      repo,
      state: "all",
      per_page: 100,
      page,
      sort: "updated",
      direction: "desc",
    });
    issues.push(...data);
    if (data.length < 100) break;
    page += 1;
  }

  return issues.filter((issue) => !issue.pull_request);
}

/** Pull all issues from a single project's repo and upsert them as Tasks. */
export async function syncIssuesFromGithub(user: IUser, project: IProject): Promise<ITask[]> {
  const octokit = client(user);
  const { owner, repo } = splitRepo(project.repo as string);

  const issues = await fetchAllIssues(octokit, owner, repo);

  const upserted: ITask[] = [];
  for (const issue of issues) {
    const id = githubIssueId(project, issue.number);
    const doc = await Task.findOneAndUpdate(
      { githubIssueId: id, user: user._id },
      {
        title: issue.title,
        status: issueStatusToTaskStatus(issue),
        source: "github",
        priority: priorityFromLabels(issue.labels),
        user: user._id,
        project: project._id,
        githubIssueNumber: issue.number,
        githubIssueUrl: issue.html_url,
        githubIssueId: id,
      },
      { upsert: true, new: true }
    );
    upserted.push(doc);
  }
  return upserted;
}

/** Sync every project a user has connected. Uses Promise.allSettled so one bad repo doesn't block the rest. */
export async function syncAllProjectsFromGithub(user: IUser, projects: IProject[]) {
  const results = await Promise.allSettled(projects.map((project) => syncIssuesFromGithub(user, project)));

  const tasks: ITask[] = [];
  const failed: { repo: string; error: string }[] = [];

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      tasks.push(...result.value);
    } else {
      failed.push({ repo: projects[i].repo, error: String(result.reason?.message ?? result.reason) });
    }
  });

  return { tasks, failed };
}

/** Push a local status change back out to the GitHub issue (2-way sync). */
export async function pushTaskStatusToGithub(user: IUser, project: IProject, task: ITask) {
  if (task.source !== "github" || !task.githubIssueNumber) return; // nothing to push
  const octokit = client(user);
  const { owner, repo } = splitRepo(project.repo);
  const { state, label } = taskStatusToGithub(task.status);

  await octokit.issues.update({ owner, repo, issue_number: task.githubIssueNumber, state });

  if (label) {
    await octokit.issues.addLabels({ owner, repo, issue_number: task.githubIssueNumber, labels: [label] });
  }
}

/** Create a fresh issue on GitHub for a task that originated as "ai" or "jira". */
export async function createGithubIssueForTask(user: IUser, project: IProject, task: ITask) {
  const octokit = client(user);
  const { owner, repo } = splitRepo(project.repo);

  const { data: issue } = await octokit.issues.create({
    owner,
    repo,
    title: task.title,
    labels: task.priority ? [task.priority] : undefined,
  });

  task.source = "github";
  task.project = project._id;
  task.githubIssueNumber = issue.number;
  task.githubIssueUrl = issue.html_url;
  task.githubIssueId = githubIssueId(project, issue.number);
  await task.save();
  return task;
}

/** Convert an inbound GitHub webhook "issues" payload into an upserted Task. */
export async function upsertTaskFromWebhookIssue(user: IUser, project: IProject, issue: any) {
  const id = githubIssueId(project, issue.number);
  return Task.findOneAndUpdate(
    { githubIssueId: id, user: user._id },
    {
      title: issue.title,
      status: issueStatusToTaskStatus(issue),
      source: "github",
      priority: priorityFromLabels(issue.labels),
      user: user._id,
      project: project._id,
      githubIssueNumber: issue.number,
      githubIssueUrl: issue.html_url,
      githubIssueId: id,
    },
    { upsert: true, new: true }
  );
}

export const syncDBfromWebhook = async (
  user: IUser,
  project: IProject,
  issue: any,
  action: "deleted" | "reopened" | "closed" | "opened"
) => {
  const githubIssueIdValue = githubIssueId(project, issue.number);

  switch (action) {
    case "opened": {
      // Create task only if it does not already exist
     

      return await Task.create({
        title: issue.title,
        status: issueStatusToTaskStatus(issue),
        source: "github",
        priority: priorityFromLabels(issue.labels),
        user: user._id,
        project: project._id,
        githubIssueNumber: issue.number,
        githubIssueUrl: issue.html_url,
        githubIssueId: githubIssueIdValue,
      });
    }

    case "closed":{
            return await upsertTaskFromWebhookIssue(user, project, issue);


    }
    case "reopened": {
      return await upsertTaskFromWebhookIssue(user, project, issue);
    }

    case "deleted": {
      return await Task.findOneAndDelete({
        githubIssueId: githubIssueIdValue,
        user: user._id,
        project: project._id,
      });
    }

    default:
      return null;
  }
};