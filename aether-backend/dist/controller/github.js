"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubCallback = exports.githubConnect = void 0;
const env_1 = require("../config/env");
const axios_1 = __importDefault(require("axios"));
const github_sync_1 = require("../services/github-sync");
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
        await (0, github_sync_1.connectGithubAccount)(state, accessToken);
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
