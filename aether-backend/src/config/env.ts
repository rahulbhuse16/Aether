import dotenv from 'dotenv'
dotenv.config()

export const ENV = {
    DB_URL: process.env.DB_URL || "",
    GROQ_API_KEY: process.env.GROQ_API_KEY || "",
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
    GITHUB_CLIENT_SECRET:process.env.GITHUB_CLIENT_SECRET || "",
    GITHUB_REDIRECT_URI: process.env.GITHUB_REDIRECT_URI || "",
    FRONTEND_URL: process.env.FRONTEND_URL || "",



}