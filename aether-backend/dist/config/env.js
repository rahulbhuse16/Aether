"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const p = process.env;
exports.ENV = {
    DB_URL: process.env.DB_URL || "",
    GROQ_API_KEY: process.env.GROQ_API_KEY || "",
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "",
    GITHUB_REDIRECT_URI: process.env.GITHUB_REDIRECT_URI || "",
    FRONTEND_URL: process.env.FRONTEND_URL || "",
    SMTP_HOST: process.env.SMTP_HOST || "",
    SMTP_PORT: process.env.SMTP_PORT || "587",
    SMTP_USER: process.env.SMTP_USER || "",
    SMTP_PASS: process.env.SMTP_PASS || "",
    SMTP_FROM: process.env.SMTP_FROM || "",
    JIRA_BASE_URL: process.env.JIRA_BASE_URL || "",
    JIRA_EMAIL: process.env.JIRA_EMAIL || "",
    JIRA_API_TOKEN: process.env.JIRA_API_TOKEN || "",
    JIRA_PROJECT_KEY: process.env.JIRA_PROJECT_KEY || "",
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || "",
    JWT_SECRET: process.env.JWT_SECRET || "",
    GITHUB_WEBHOOK_SECRET: p.GITHUB_WEBHOOK_SECRET || "",
    GITHUB_WEBHOOK_URL: p.GITHUB_WEBHOOK_URL || ""
};
