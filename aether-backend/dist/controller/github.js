"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectGithubAccount = void 0;
const project_1 = require("../models/project");
const user_1 = require("../models/user");
const helper_1 = require("../utils/helper");
const axios_1 = __importDefault(require("axios"));
const connectGithubAccount = async (req, res) => {
    try {
        const { userId, accessToken } = req.body;
        if (!userId || !accessToken) {
            res.status(400).json({
                success: false,
                message: "userId and accessToken are required.",
            });
            return;
        }
        const user = await user_1.User.findById(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found.",
            });
            return;
        }
        // Save GitHub token
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
        res.status(200).json({
            success: true,
            message: "GitHub connected successfully.",
            data: {
                projects: projects.map((project) => ({
                    id: project.githubRepoId,
                    name: project.name,
                    repo: project.repo,
                    openTasks: project.openTasks,
                    lastActivity: project.lastActivity,
                })),
                currentProjectId: projects.length
                    ? projects[0]._id.toString()
                    : null,
            },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to connect GitHub.",
        });
    }
};
exports.connectGithubAccount = connectGithubAccount;
