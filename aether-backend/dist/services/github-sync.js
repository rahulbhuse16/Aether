"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGithubWebhook = exports.connectGithubAccount = void 0;
const project_1 = require("../models/project");
const user_1 = require("../models/user");
const helper_1 = require("../utils/helper");
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const connectGithubAccount = async (userId, accessToken) => {
    try {
        if (!userId || !accessToken) {
            return;
        }
        const user = await user_1.User.findById(userId);
        if (!user) {
            return;
        }
        user.githubAccessToken = accessToken;
        user.githubConnected = true;
        await user.save();
        // Fetch repositories
        const { data: repos } = await axios_1.default.get("https://api.github.com/user/repos", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github+json",
            },
            params: {
                sort: "updated",
                per_page: 100,
            },
        });
        for (const repo of repos) {
            await (0, exports.registerGithubWebhook)(accessToken, repo.owner.login, repo.name);
        }
        const bulkOperations = repos.map((repo) => ({
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
                        lastActivity: (0, helper_1.formatTimeAgo)(repo.updated_at),
                        githubUpdatedAt: repo.updated_at,
                    },
                },
                upsert: true,
            },
        }));
        if (bulkOperations.length) {
            await project_1.Project.bulkWrite(bulkOperations);
        }
        const projects = await project_1.Project.find({ owner: user._id })
            .sort({ githubUpdatedAt: -1 })
            .select("name repo openTasks lastActivity");
    }
    catch (error) {
        console.error(error);
    }
};
exports.connectGithubAccount = connectGithubAccount;
const registerGithubWebhook = async (accessToken, owner, repo) => {
    try {
        const { data } = await axios_1.default.post(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
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
                url: env_1.ENV.GITHUB_WEBHOOK_URL,
                content_type: "json",
                secret: env_1.ENV.GITHUB_WEBHOOK_SECRET,
                insecure_ssl: "0",
            },
        }, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });
        console.log(`Webhook registered for ${owner}/${repo}`, data.id);
        return data;
    }
    catch (error) {
        // GitHub returns 422 if a similar webhook already exists
        if (error?.response?.status === 422) {
            console.log(`Webhook already exists for ${owner}/${repo}`);
            return null;
        }
        console.error("Webhook registration failed:", error?.response?.data || error.message);
        throw error;
    }
};
exports.registerGithubWebhook = registerGithubWebhook;
