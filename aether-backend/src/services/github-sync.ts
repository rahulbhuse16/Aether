import { Project } from "../models/project";
import { User } from "../models/user";
import { formatTimeAgo } from "../utils/helper";
import axios from "axios";
import {ENV} from "../config/env"


export const connectGithubAccount = async (
  userId: string,
  accessToken: string
) => {
  try {

    if (!userId || !accessToken) {

      return;
    }

    const user = await User.findById(userId);

    if (!user) {

      return;
    }

    user.githubAccessToken = accessToken;
    user.githubConnected = true;

    await user.save();

    // Fetch repositories
    const { data: repos } = await axios.get(
      "https://api.github.com/user/repos",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
        params: {
          sort: "updated",
          per_page: 100,
        },
      }
    );

    for (const repo of repos) {
      await registerGithubWebhook(
        accessToken,
        repo.owner.login,
        repo.name
      );
    }

    const bulkOperations = repos.map((repo: any) => ({
      updateOne: {
        filter: {
          owner: user._id,
          githubRepoId: repo.id,
        },
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

    if (bulkOperations.length) {
      await Project.bulkWrite(bulkOperations);
    }

    const projects = await Project.find({ owner: user._id })
      .sort({ githubUpdatedAt: -1 })
      .select("name repo openTasks lastActivity");


  } catch (error: any) {
    console.error(error);


  }
};



export const registerGithubWebhook = async (
  accessToken: string,
  owner: string,
  repo: string
) => {
  try {
    const { data } = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/hooks`,
      {
        name: "web",
        active: true,
        events: [
          "push",
          "issues",
          "pull_request",
          "issue_comment",
          "create",
          "delete",
          "release",
          "workflow_run",
        ],
        config: {
          url: ENV.GITHUB_WEBHOOK_URL,
          content_type: "json",
          secret: ENV.GITHUB_WEBHOOK_SECRET,
          insecure_ssl: "0",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    console.log(
      `Webhook registered for ${owner}/${repo}`,
      data.id
    );

    return data;
  } catch (error: any) {
    // GitHub returns 422 if a similar webhook already exists
    if (error?.response?.status === 422) {
      console.log(
        `Webhook already exists for ${owner}/${repo}`
      );

      return null;
    }

    console.error(
      "Webhook registration failed:",
      error?.response?.data || error.message
    );

    throw error;
  }
};