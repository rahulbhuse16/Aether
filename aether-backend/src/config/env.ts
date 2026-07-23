import dotenv from 'dotenv'
dotenv.config({
  path: process.env.ENVFILE || ".env",
});

const p=process.env

export const ENV = {
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
    GITHUB_WEBHOOK_SECRET:p.GITHUB_WEBHOOK_SECRET || "",
    GITHUB_WEBHOOK_URL:p.GITHUB_WEBHOOK_URL || "",
    CALENDAR_REDIRECT_URI:p.CALENDAR_REDIRECT_URI || "",
    GOOGLE_WEBHOOK_URL:p.GOOGLE_WEBHOOK_URL || "",
    SLACK_CLIENT_ID:p.SLACK_CLIENT_ID || "",
    SLACK_CLIENT_SECRET:p.SLACK_CLIENT_SECRET || "",
    SLACK_REDIRECT_URI:p.SLACK_REDIRECT_URI || "",
    SLACK_WEBHOOK_URL:p.SLACK_WEBHOOK_URL || "",
    SLACK_SIGNING_SECRET : p.SLACK_SIGNING_SECRET || "",





}