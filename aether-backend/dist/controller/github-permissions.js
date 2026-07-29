"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncRepositories = exports.updateGitHubPermissions = exports.getGitHubPermissions = void 0;
const github_permissions_1 = __importDefault(require("../models/github-permissions"));
const user_1 = require("../models/user");
const project_1 = require("../models/project");
/**
 * Get GitHub permissions for a user
 */
const getGitHubPermissions = async (req, res) => {
    try {
        const userId = req.params.userId;
        let permissions = await github_permissions_1.default.findOne({ userId });
        if (!permissions) {
            permissions = await github_permissions_1.default.create({
                userId,
                repoAccess: [],
                webhookEnabled: false,
                commitAnalysisEnabled: false,
                prAnalysisEnabled: false,
            });
        }
        return res.status(200).json({
            success: true,
            data: {
                repoAccess: permissions.repoAccess,
                webhookEnabled: permissions.webhookEnabled,
                commitAnalysisEnabled: permissions.commitAnalysisEnabled,
                prAnalysisEnabled: permissions.prAnalysisEnabled,
                lastSync: permissions.lastSync,
            },
        });
    }
    catch (error) {
        console.error("getGitHubPermissions error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch GitHub permissions",
        });
    }
};
exports.getGitHubPermissions = getGitHubPermissions;
/**
 * Update GitHub permissions
 */
const updateGitHubPermissions = async (req, res) => {
    try {
        const userId = req.params.userId;
        const { webhookEnabled, commitAnalysisEnabled, prAnalysisEnabled } = req.body;
        let permissions = await github_permissions_1.default.findOne({ userId });
        if (!permissions) {
            permissions = await github_permissions_1.default.create({
                userId,
                repoAccess: [],
                webhookEnabled: webhookEnabled || false,
                commitAnalysisEnabled: commitAnalysisEnabled || false,
                prAnalysisEnabled: prAnalysisEnabled || false,
            });
        }
        else {
            if (webhookEnabled !== undefined) {
                permissions.webhookEnabled = webhookEnabled;
            }
            if (commitAnalysisEnabled !== undefined) {
                permissions.commitAnalysisEnabled = commitAnalysisEnabled;
            }
            if (prAnalysisEnabled !== undefined) {
                permissions.prAnalysisEnabled = prAnalysisEnabled;
            }
            await permissions.save();
        }
        return res.status(200).json({
            success: true,
            data: {
                repoAccess: permissions.repoAccess,
                webhookEnabled: permissions.webhookEnabled,
                commitAnalysisEnabled: permissions.commitAnalysisEnabled,
                prAnalysisEnabled: permissions.prAnalysisEnabled,
                lastSync: permissions.lastSync,
            },
        });
    }
    catch (error) {
        console.error("updateGitHubPermissions error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update GitHub permissions",
        });
    }
};
exports.updateGitHubPermissions = updateGitHubPermissions;
/**
 * Sync repositories
 */
const syncRepositories = async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await user_1.User.findById(userId);
        if (!user || !user.githubConnected) {
            return res.status(400).json({
                success: false,
                message: "GitHub not connected",
            });
        }
        // TODO: Implement actual GitHub API call to fetch repositories
        // For now, return mock data
        const repoAccess = await project_1.Project.distinct("repo", {
            owner: userId,
        });
        let permissions = await github_permissions_1.default.findOne({ userId });
        if (!permissions) {
            permissions = await github_permissions_1.default.create({
                userId,
                repoAccess,
                webhookEnabled: false,
                commitAnalysisEnabled: false,
                prAnalysisEnabled: false,
                lastSync: new Date(),
            });
        }
        else {
            permissions.repoAccess = repoAccess;
            permissions.lastSync = new Date();
            await permissions.save();
        }
        return res.status(200).json({
            success: true,
            message: "Repositories synced successfully",
            data: {
                repoAccess: permissions.repoAccess,
                webhookEnabled: permissions.webhookEnabled,
                commitAnalysisEnabled: permissions.commitAnalysisEnabled,
                prAnalysisEnabled: permissions.prAnalysisEnabled,
                lastSync: permissions.lastSync,
            },
        });
    }
    catch (error) {
        console.error("syncRepositories error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to sync repositories",
        });
    }
};
exports.syncRepositories = syncRepositories;
