import { ENV } from "../config/env";
import axios from "axios";
import { Request, Response } from "express";
import { connectGithubAccount } from "../services/github-sync";








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

