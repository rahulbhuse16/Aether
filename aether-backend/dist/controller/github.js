"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubWebhookController = exports.getPRByRepoId = exports.githubCallback = exports.githubConnect = void 0;
const env_1 = require("../config/env");
const axios_1 = __importDefault(require("axios"));
const github_sync_1 = require("../services/github-sync");
const user_1 = require("../models/user");
const crypto_1 = __importDefault(require("crypto"));
const project_1 = require("../models/project");
const github_connect_1 = require("../services/github-connect");
/**
 * Redirect user to GitHub OAuth
 * GET /api/github/connect
 */
const githubConnect = async (req, res) => {
    console.log("githubConnect");
    try {
        const clientId = env_1.ENV.GITHUB_CLIENT_ID;
        const { state } = req.query;
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
        const githubUrl = "https://github.com/login/oauth/authorize" +
            `?client_id=${env_1.ENV.GITHUB_CLIENT_ID}` +
            `&redirect_uri=${encodeURIComponent(env_1.ENV.GITHUB_REDIRECT_URI)}` +
            `&scope=${encodeURIComponent(scopes)}` +
            `&allow_signup=true` + `&state=${encodeURIComponent(state)}`;
        res.redirect(githubUrl);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "GitHub connection failed.",
        });
    }
};
exports.githubConnect = githubConnect;
/**
 * GitHub OAuth Callback
 * GET /api/github/callback
 */
const githubCallback = async (req, res) => {
    try {
        const { code, state } = req.query;
        console.log("code", code);
        if (!code || typeof code !== "string") {
            res.status(400).json({
                success: false,
                message: "Authorization code is missing.",
            });
            return;
        }
        const tokenResponse = await axios_1.default.post("https://github.com/login/oauth/access_token", {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: process.env.GITHUB_REDIRECT_URI,
        }, {
            headers: {
                Accept: "application/json",
            },
        });
        const accessToken = tokenResponse.data.access_token;
        console.log("accessToken", accessToken);
        if (!accessToken) {
            res.status(400).json({
                success: false,
                message: "Unable to retrieve GitHub access token.",
            });
            return;
        }
        await (0, github_connect_1.connectGithubAccount)(state, accessToken);
        res.redirect(`${env_1.ENV.FRONTEND_URL}/onboarding?success=true`);
    }
    catch (error) {
        console.error("GitHub Callback Error:", error.response?.data || error);
        res.status(500).json({
            success: false,
            message: "GitHub authentication failed.",
            error: error.response?.data || error.message,
        });
    }
};
exports.githubCallback = githubCallback;
const getPRByRepoId = async (req, res) => {
    try {
        const { repoId, userId } = req.query;
        if (!repoId || !userId) {
            res.status(400).json({
                success: false,
                message: "Repository ID or User Id is required.",
            });
            return;
        }
        const user = await user_1.User.findById(userId).select("+githubAccessToken");
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
        const { data: repo } = await axios_1.default.get(`https://api.github.com/repositories/${repoId}`, { headers });
        const owner = repo.owner.login;
        const name = repo.name;
        // Step 2: Get all pull requests
        const { data: prs } = await axios_1.default.get(`https://api.github.com/repos/${owner}/${name}/pulls?state=all`, { headers });
        const pullRequests = prs.map((pr) => ({
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
    }
    catch (error) {
        console.error("GitHub API Error:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            success: false,
            message: error.response?.data?.message || "Failed to fetch pull requests.",
        });
    }
};
exports.getPRByRepoId = getPRByRepoId;
function verifySignature(secret, payload, signature) {
    if (!signature)
        return false;
    const expected = "sha256=" + crypto_1.default.createHmac("sha256", secret).update(payload).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    // timingSafeEqual throws on mismatched lengths rather than returning false — guard first.
    return a.length === b.length && crypto_1.default.timingSafeEqual(a, b);
}
const githubWebhookController = async (req, res) => {
    console.log("calling webhook");
    const signature = req.header("x-hub-signature-256") ?? undefined;
    if (!verifySignature(env_1.ENV.GITHUB_WEBHOOK_SECRET, req.body, signature)) {
        return res.status(401).json({ error: "Invalid webhook signature" });
    }
    const event = req.header("x-github-event");
    console.log("calling event", event, signature);
    let payload;
    try {
        payload = JSON.parse(req.body.toString("utf8"));
    }
    catch {
        return res.status(400).json({ error: "Malformed payload" });
    }
    // GitHub sends this the moment a webhook is created, before any real event —
    // must return 2xx or GitHub will report the hook as failing immediately.
    if (event === "ping") {
        return res.status(200).json({ pong: true });
    }
    try {
        const repoId = payload.repository?.id;
        if (!repoId)
            return res.status(200).json({ received: true }); // nothing we can act on
        // A repo is only synced for the user(s) who connected it as a Project.
        const projects = await project_1.Project.find({ githubRepoId: repoId });
        if (!projects.length)
            return res.status(200).json({ received: true });
        if (event === "issues" && payload.issue) {
            await Promise.allSettled(projects.map(async (project) => {
                const user = await user_1.User.findById(project.owner).select("+githubAccessToken");
                if (!user)
                    return;
                await (0, github_sync_1.syncDBfromWebhook)(user, project, payload.issue, payload.action);
            }));
        }
        // We subscribe to push / pull_request / issue_comment / create / delete /
        // release / workflow_run too (see WEBHOOK_EVENTS in github.connection.service.ts),
        // but only "issues" drives the task board today. Acknowledging the rest with
        // 200 keeps the hook healthy in GitHub's UI instead of it being flagged as
        // failing; add handling for a given event here once you need it.
        res.status(200).json({ received: true });
    }
    catch (error) {
        console.error(`[webhook/github] failed handling "${event}" event:`, error);
        // Still 200: a 5xx here makes GitHub retry, and retries of a bug just
        // repeat the same failure. Log it and let sync-on-poll catch up instead.
        res.status(200).json({ received: true, error: "Processing failed, logged for investigation" });
    }
};
exports.githubWebhookController = githubWebhookController;
