"use strict";
// Path: src/services/groqClient.ts
//
// Requires: npm install groq-sdk
// Env: GROQ_API_KEY
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GROQ_MODEL = exports.groq = void 0;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const env_1 = require("./env");
exports.groq = new groq_sdk_1.default({ apiKey: env_1.ENV.GROQ_API_KEY });
// Centralized so every AI feature uses the same model without hunting
// through files to bump it later. Llama 3.3 70B is a solid default on
// Groq for structured-JSON tasks like this at low latency/cost; swap
// for a bigger model here if digest quality needs to go up.
exports.GROQ_MODEL = "llama-3.3-70b-versatile";
