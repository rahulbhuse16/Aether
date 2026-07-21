import { ENV } from "../config/env";
import axios from "axios";
import { Request, Response } from "express";
import { syncDBfromWebhook, upsertTaskFromWebhookIssue } from "../services/github-sync";
import { IUser, User } from "../models/user";
import crypto from "crypto";
import { Project } from "../models/project";
import { formatTimeAgo } from "../utils/helper";
import { connectGithubAccount } from "../services/github-connect";
import { buildGithubNotification, saveNotification } from "../utils/notifications";
import { NotificationType } from "../models/notification";
import { sendSseEvent } from "../services/sse";








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
    const { state } = req.query

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
    const { code, state } = req.query;

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




    await connectGithubAccount(state as string, accessToken)




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
) => {
  try {
    const { repoId, userId } = req.query;




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










function verifySignature(secret: string, payload: Buffer, signature?: string): boolean {
  if (!signature) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  // timingSafeEqual throws on mismatched lengths rather than returning false — guard first.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export const githubWebhookController = async (
  req: Request,
  res: Response
) => {
  console.log("calling webhook")
  const signature = req.header("x-hub-signature-256") ?? undefined;
  if (!verifySignature(ENV.GITHUB_WEBHOOK_SECRET, req.body, signature)) {
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  const event = req.header("x-github-event");
  console.log("calling event", event, signature)
  let payload: any;
  try {
    payload = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Malformed payload" });
  }

  // GitHub sends this the moment a webhook is created, before any real event —
  // must return 2xx or GitHub will report the hook as failing immediately.
  if (event === "ping") {
    return res.status(200).json({ pong: true });
  }

  try {
    const repoId = payload.repository?.id;
    if (!repoId) return res.status(200).json({ received: true }); // nothing we can act on

    // A repo is only synced for the user(s) who connected it as a Project.
    const projects = await Project.find({
      githubRepoId: payload.repository.id,
    }).populate("owner");
    console.log("projects", projects)
    if (!projects.length) return res.status(200).json({ received: true });

    if (event === "issues" && payload.issue) {
      await Promise.allSettled(
        projects.map(async (project) => {
          const user = project.owner as unknown as IUser;

          console.log("user", user);

          if (!user || !user._id) {
            console.error(
              "Owner user not found:",
              project.owner
            );
            return;
          }

          await syncDBfromWebhook(
            user,
            project,
            payload.issue,
            payload.action
          );

          const notification = buildGithubNotification(
            event!,
            payload.action,
            payload,
          );

          if (notification) {
            const savedNotification = await saveNotification({
              userId: user._id.toString(),
              ...notification,
            });

            sendSseEvent(
              user._id.toString(),
              "notification",
              savedNotification
            );
          }

        })


      );
    }

    // We subscribe to push / pull_request / issue_comment / create / delete /
    // release / workflow_run too (see WEBHOOK_EVENTS in github.connection.service.ts),
    // but only "issues" drives the task board today. Acknowledging the rest with
    // 200 keeps the hook healthy in GitHub's UI instead of it being flagged as
    // failing; add handling for a given event here once you need it.

    res.status(200).json({ received: true });
  } catch (error) {
    console.error(`[webhook/github] failed handling "${event}" event:`, error);
    // Still 200: a 5xx here makes GitHub retry, and retries of a bug just
    // repeat the same failure. Log it and let sync-on-poll catch up instead.
    res.status(200).json({ received: true, error: "Processing failed, logged for investigation" });
  }
};

