"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncDBfromWebhook = void 0;
exports.syncIssuesFromGithub = syncIssuesFromGithub;
exports.syncAllProjectsFromGithub = syncAllProjectsFromGithub;
exports.pushTaskStatusToGithub = pushTaskStatusToGithub;
exports.createGithubIssueForTask = createGithubIssueForTask;
exports.upsertTaskFromWebhookIssue = upsertTaskFromWebhookIssue;
const rest_1 = require("@octokit/rest");
const task_1 = require("../models/task");
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
function client(user) {
    return new rest_1.Octokit({ auth: user.githubAccessToken });
}
function splitRepo(repoFullName) {
    const [owner, repo] = repoFullName.split("/");
    if (!owner || !repo)
        throw new Error(`Invalid repo "${repoFullName}", expected "owner/repo"`);
    return { owner, repo };
}
function githubIssueId(project, issueNumber) {
    return `${project.githubRepoId}-${issueNumber}`;
}
function issueStatusToTaskStatus(issue) {
    if (issue.state === "closed")
        return "done";
    const inProgress = issue.labels?.some((l) => (typeof l === "string" ? l : l.name)?.toLowerCase() === "in progress");
    return inProgress ? "in_progress" : "open";
}
function taskStatusToGithub(status) {
    if (status === "done")
        return { state: "closed" };
    if (status === "in_progress")
        return { state: "open", label: "in progress" };
    return { state: "open" };
}
function priorityFromLabels(labels) {
    const names = labels?.map((l) => (typeof l === "string" ? l : l.name)?.toLowerCase()) ?? [];
    if (names.includes("high") || names.includes("priority: high"))
        return "high";
    if (names.includes("medium") || names.includes("priority: medium"))
        return "medium";
    if (names.includes("low") || names.includes("priority: low"))
        return "low";
    return undefined;
}
/** Pulls every page of issues for a repo (open + closed), skipping pull requests. */
async function fetchAllIssues(octokit, owner, repo) {
    const issues = [];
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
        if (data.length < 100)
            break;
        page += 1;
    }
    return issues.filter((issue) => !issue.pull_request);
}
/** Pull all issues from a single project's repo and upsert them as Tasks. */
async function syncIssuesFromGithub(user, project) {
    const octokit = client(user);
    const { owner, repo } = splitRepo(project.repo);
    const issues = await fetchAllIssues(octokit, owner, repo);
    const upserted = [];
    for (const issue of issues) {
        const id = githubIssueId(project, issue.number);
        const doc = await task_1.Task.findOneAndUpdate({ githubIssueId: id, user: user._id }, {
            title: issue.title,
            status: issueStatusToTaskStatus(issue),
            source: "github",
            priority: priorityFromLabels(issue.labels),
            user: user._id,
            project: project._id,
            githubIssueNumber: issue.number,
            githubIssueUrl: issue.html_url,
            githubIssueId: id,
        }, { upsert: true, new: true });
        upserted.push(doc);
    }
    return upserted;
}
/** Sync every project a user has connected. Uses Promise.allSettled so one bad repo doesn't block the rest. */
async function syncAllProjectsFromGithub(user, projects) {
    const results = await Promise.allSettled(projects.map((project) => syncIssuesFromGithub(user, project)));
    const tasks = [];
    const failed = [];
    results.forEach((result, i) => {
        if (result.status === "fulfilled") {
            tasks.push(...result.value);
        }
        else {
            failed.push({ repo: projects[i].repo, error: String(result.reason?.message ?? result.reason) });
        }
    });
    return { tasks, failed };
}
/** Push a local status change back out to the GitHub issue (2-way sync). */
async function pushTaskStatusToGithub(user, project, task) {
    if (task.source !== "github" || !task.githubIssueNumber)
        return; // nothing to push
    const octokit = client(user);
    const { owner, repo } = splitRepo(project.repo);
    const { state, label } = taskStatusToGithub(task.status);
    await octokit.issues.update({ owner, repo, issue_number: task.githubIssueNumber, state });
    if (label) {
        await octokit.issues.addLabels({ owner, repo, issue_number: task.githubIssueNumber, labels: [label] });
    }
}
/** Create a fresh issue on GitHub for a task that originated as "ai" or "jira". */
async function createGithubIssueForTask(user, project, task) {
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
async function upsertTaskFromWebhookIssue(user, project, issue) {
    const id = githubIssueId(project, issue.number);
    return task_1.Task.findOneAndUpdate({ githubIssueId: id, user: user._id }, {
        title: issue.title,
        status: issueStatusToTaskStatus(issue),
        source: "github",
        priority: priorityFromLabels(issue.labels),
        user: user._id,
        project: project._id,
        githubIssueNumber: issue.number,
        githubIssueUrl: issue.html_url,
        githubIssueId: id,
    }, { upsert: true, new: true });
}
const syncDBfromWebhook = async (user, project, issue, action) => {
    const githubIssueIdValue = githubIssueId(project, issue.number);
    switch (action) {
        case "opened": {
            // Create task only if it does not already exist
            const existingTask = await task_1.Task.findOne({
                githubIssueId: githubIssueIdValue,
                user: user._id,
                project: project._id,
            });
            if (existingTask) {
                return existingTask;
            }
            return await task_1.Task.create({
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
        case "closed": {
            return await upsertTaskFromWebhookIssue(user, project, issue);
        }
        case "reopened": {
            return await upsertTaskFromWebhookIssue(user, project, issue);
        }
        case "deleted": {
            return await task_1.Task.findOneAndDelete({
                githubIssueId: githubIssueIdValue,
                user: user._id,
                project: project._id,
            });
        }
        default:
            return null;
    }
};
exports.syncDBfromWebhook = syncDBfromWebhook;
