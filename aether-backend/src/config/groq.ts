// Path: src/services/groqClient.ts
//
// Requires: npm install groq-sdk
// Env: GROQ_API_KEY

import Groq from "groq-sdk";
import { ENV } from "./env";



export const groq = new Groq({ apiKey: ENV.GROQ_API_KEY });

// Centralized so every AI feature uses the same model without hunting
// through files to bump it later. Llama 3.3 70B is a solid default on
// Groq for structured-JSON tasks like this at low latency/cost; swap
// for a bigger model here if digest quality needs to go up.
export const GROQ_MODEL = "llama-3.3-70b-versatile";