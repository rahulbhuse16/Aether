"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.ENV = {
    DB_URL: process.env.DB_URL || "",
    GROQ_API_KEY: process.env.GROQ_API_KEY || "",
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "",
    GITHUB_REDIRECT_URI: process.env.GITHUB_REDIRECT_URI || "",
    FRONTEND_URL: process.env.FRONTEND_URL || "",
};
