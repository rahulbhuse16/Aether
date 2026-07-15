import { ENV } from "../config/env";
import axios from "axios";
import { Request, Response } from "express";
import { connectGithubAccount } from "../services/github-sync";
import { User } from "../models/user";








/**
 * Redirect user to GitHub OAuth
 * GET /api/github/connect
 */
export const githubConnect = async (
  req: Request,
  res: Response
): Promise<void> => {
  console.log("githubConnect")
  try {
    const clientId = ENV.GITHUB_CLIENT_ID;
    const {state}=req.query

    if (!clientId) {
      res.status(500).json({
        success: false,
        message: "GitHub Client ID is missing.",
      });
      return;
    }

    const scopes = [
      "read:user",
      "user:email",
      "repo",
      "workflow",
    ].join(" ");

    const githubUrl =
      "https://github.com/login/oauth/authorize" +
      `?client_id=${ENV.GITHUB_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(ENV.GITHUB_REDIRECT_URI)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&allow_signup=true` + `&state=${encodeURIComponent(state as string)}`;

    res.redirect(githubUrl);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "GitHub connection failed.",
    });
  }
};

/**
 * GitHub OAuth Callback
 * GET /api/github/callback
 */
export const githubCallback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { code,state } = req.query;

    console.log("code", code)

    if (!code || typeof code !== "string") {
      res.status(400).json({
        success: false,
        message: "Authorization code is missing.",
      });
      return;
    }

    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_REDIRECT_URI,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    console.log("accessToken", accessToken)


    if (!accessToken) {
      res.status(400).json({
        success: false,
        message: "Unable to retrieve GitHub access token.",
      });
      return;
    }

    


    await connectGithubAccount(state as string,accessToken)




    res.redirect(
      `${ENV.FRONTEND_URL}/onboarding?success=true`
    );
  } catch (error: any) {
    console.error("GitHub Callback Error:", error.response?.data || error);

    res.status(500).json({
      success: false,
      message: "GitHub authentication failed.",
      error: error.response?.data || error.message,
    });
  }
};





export const getPRByRepoId = async (
  req: Request,
  res: Response
)=> {
  try {
    const { repoId,userId } = req.query;

    


    if (!repoId || !userId) {
      res.status(400).json({
        success: false,
        message: "Repository ID or User Id is required.",
      });
      return;
    }

    const user = await User.findById(userId).select("+githubAccessToken");
        if (!user?.githubAccessToken) {
          return res.status(409).json({ error: "GitHub account not connected" });
        }
    const accessToken = user.githubAccessToken;

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    // Step 1: Get repository details from repository ID
    const { data: repo } = await axios.get(
      `https://api.github.com/repositories/${repoId}`,
      { headers }
    );

    const owner = repo.owner.login;
    const name = repo.name;

    // Step 2: Get all pull requests
    const { data: prs } = await axios.get(
      `https://api.github.com/repos/${owner}/${name}/pulls?state=all`,
      { headers }
    );

    const pullRequests = prs.map((pr: any) => ({
      id: `pr${pr.id}`,
      number: pr.number,
      title: pr.title,
      author: pr.user.login,
      status: pr.state, // open | closed
      reviewed: pr.requested_reviewers.length === 0,
    }));

    res.status(200).json({
      success: true,
      repository: {
        id: repo.id,
        name: repo.name,
        owner: owner,
      },
      count: pullRequests.length,
      pullRequests,
    });
  } catch (error: any) {
    console.error("GitHub API Error:", error.response?.data || error.message);

    res.status(error.response?.status || 500).json({
      success: false,
      message:
        error.response?.data?.message || "Failed to fetch pull requests.",
    });
  }
};

