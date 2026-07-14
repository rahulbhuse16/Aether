import { Project } from "../models/project";
import { User } from "../models/user";
import { formatTimeAgo } from "../utils/helper";
import axios from "axios";
import { Request, Response } from "express";


export const connectGithubAccount = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId, accessToken } = req.body;

    if (!userId || !accessToken) {
      res.status(400).json({
        success: false,
        message: "userId and accessToken are required.",
      });
      return;
    }

    const user = await User.findById(userId);

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

    res.status(200).json({
      success: true,
      message: "GitHub connected successfully.",
      data: {
        projects: projects.map((project) => ({
          id: project._id,
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
  } catch (error: any) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to connect GitHub.",
    });
  }
};

