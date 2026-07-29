import { Request, Response } from "express";
import GitHubPermissions from "../models/github-permissions";
import { User } from "../models/user";
import { Project } from "../models/project";

/**
 * Get GitHub permissions for a user
 */
export const getGitHubPermissions = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.params.userId;

    let permissions = await GitHubPermissions.findOne({ userId });

    if (!permissions) {
      permissions = await GitHubPermissions.create({
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
  } catch (error: any) {
    console.error("getGitHubPermissions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch GitHub permissions",
    });
  }
};

/**
 * Update GitHub permissions
 */
export const updateGitHubPermissions = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.params.userId;
    const { webhookEnabled, commitAnalysisEnabled, prAnalysisEnabled } = req.body;

    let permissions = await GitHubPermissions.findOne({ userId });

    if (!permissions) {
      permissions = await GitHubPermissions.create({
        userId,
        repoAccess: [],
        webhookEnabled: webhookEnabled || false,
        commitAnalysisEnabled: commitAnalysisEnabled || false,
        prAnalysisEnabled: prAnalysisEnabled || false,
      });
    } else {
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
  } catch (error: any) {
    console.error("updateGitHubPermissions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update GitHub permissions",
    });
  }
};

/**
 * Sync repositories
 */
export const syncRepositories = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId);

    if (!user || !user.githubConnected) {
      return res.status(400).json({
        success: false,
        message: "GitHub not connected",
      });
    }

    // TODO: Implement actual GitHub API call to fetch repositories
    // For now, return mock data
    const repoAccess = await Project.distinct("repo", {
      owner: userId,
    });

    let permissions = await GitHubPermissions.findOne({ userId });

    if (!permissions) {
      permissions = await GitHubPermissions.create({
        userId,
        repoAccess,
        webhookEnabled: false,
        commitAnalysisEnabled: false,
        prAnalysisEnabled: false,
        lastSync: new Date(),
      });
    } else {
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
  } catch (error: any) {
    console.error("syncRepositories error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to sync repositories",
    });
  }
};
