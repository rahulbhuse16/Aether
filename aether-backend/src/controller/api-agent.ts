/**
 * apiagentcontrolller.ts
 *
 * Single-file backend module for the "API Agent" feature.
 * Given a Swagger/OpenAPI URL, this:
 *   1. Fetches + condenses the spec (to keep token usage sane)
 *   2. Sends it to Groq with a strict system prompt
 *   3. Gets back structured JSON matching the frontend's `ApiArtifact[]` shape
 *   4. Persists the session in MongoDB
 *   5. Returns JSON the React/Redux frontend can drop straight into state
 *
 * Requires:
 *   npm i groq-sdk mongoose axios express
 *
 * Env vars:
 *   GROQ_API_KEY   - required
 *   GROQ_MODEL     - optional, defaults to "llama-3.3-70b-versatile"
 *                    (check https://console.groq.com/docs/models for the
 *                    current list of available models before deploying —
 *                    Groq's supported model lineup changes over time)
 */

import { Request, Response } from "express";
import mongoose, { Schema, Document, Model } from "mongoose";
import axios from "axios";
import Groq from "groq-sdk";
import { ENV } from "../config/env";

/* ------------------------------------------------------------------ */
/*  Types (mirrors the frontend's ApiArtifact contract)                */
/* ------------------------------------------------------------------ */

export type ArtifactType = "docs" | "hooks" | "types" | "service" | "postman" | "tests";
export type ArtifactStatus = "ready" | "generating" | "error";

export interface ApiArtifact {
  id: string;
  name: string;
  type: ArtifactType;
  status: ArtifactStatus;
  preview: string; // short snippet shown on the card (<= ~220 chars)
  content: string; // full generated content, used for copy/download
  language: string; // hint for syntax highlighting on the frontend
}

const ARTIFACT_SPECS: Record<
  ArtifactType,
  { name: string; language: string; extension: string }
> = {
  docs: { name: "API Documentation", language: "markdown", extension: "md" },
  hooks: { name: "React Query Hooks", language: "typescript", extension: "ts" },
  types: { name: "TypeScript Types", language: "typescript", extension: "ts" },
  service: { name: "Axios Service", language: "typescript", extension: "ts" },
  postman: { name: "Postman Collection", language: "json", extension: "json" },
  tests: { name: "Test Cases", language: "typescript", extension: "ts" },
};

/* ------------------------------------------------------------------ */
/*  Mongoose model                                                     */
/* ------------------------------------------------------------------ */

interface ArtifactSubdoc extends ApiArtifact {}

const ArtifactSchema = new Schema<ArtifactSubdoc>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["docs", "hooks", "types", "service", "postman", "tests"],
    },
    status: { type: String, required: true, enum: ["ready", "generating", "error"] },
    preview: { type: String, required: true },
    content: { type: String, required: true },
    language: { type: String, required: true },
  },
  { _id: false }
);

export interface ApiAgentSessionDoc extends Document {
  userId?: string;
  swaggerUrl: string;
  specTitle?: string;
  artifacts: ArtifactSubdoc[];
  createdAt: Date;
  updatedAt: Date;
}

const ApiAgentSessionSchema = new Schema<ApiAgentSessionDoc>(
  {
    userId: { type: String, index: true },
    swaggerUrl: { type: String, required: true, index: true },
    specTitle: { type: String },
    artifacts: { type: [ArtifactSchema], default: [] },
  },
  { timestamps: true }
);

export const ApiAgentSession: Model<ApiAgentSessionDoc> =
  mongoose.models.ApiAgentSession ||
  mongoose.model<ApiAgentSessionDoc>("ApiAgentSession", ApiAgentSessionSchema);

/* ------------------------------------------------------------------ */
/*  Groq client                                                        */
/* ------------------------------------------------------------------ */

const groq = new Groq({ apiKey: ENV.GROQ_API_KEY });
const GROQ_MODEL = "llama-3.3-70b-versatile";

/* ------------------------------------------------------------------ */
/*  System instruction                                                 */
/* ------------------------------------------------------------------ */

const SYSTEM_INSTRUCTION = `You are "API Agent", a senior full-stack engineer that converts an OpenAPI/Swagger specification into production-ready developer tooling.

You will be given a CONDENSED summary of an OpenAPI spec (title, base info, and a list of endpoints with method, path, params, request body shape, and response shape). It may be truncated if the spec is large — do your best with what is given, and never invent endpoints that were not listed.

You must output ONLY a single JSON object (no markdown fences, no commentary, no text before or after) with this exact shape:

{
  "specTitle": string,          // best-guess API title, e.g. "Users API"
  "artifacts": [
    {
      "type": "docs" | "hooks" | "types" | "service" | "postman" | "tests",
      "content": string         // the FULL generated file content for that artifact
    }
    // ... one object per requested type, in the order requested
  ]
}

Rules for each artifact "type":

- "docs": Markdown API reference. One section per endpoint (## METHOD /path), short description, parameters table, example request/response. Use proper markdown, not HTML.

- "hooks": React Query v5 hooks (import from "@tanstack/react-query"). One hook per GET endpoint (useXxx) and one mutation hook per POST/PUT/PATCH/DELETE endpoint (useCreateXxx, useUpdateXxx, useDeleteXxx). Import request functions from a sibling "./service" module and types from "./types". Fully typed, no "any".

- "types": TypeScript interfaces/types for every request body, query param object, and response body implied by the spec. Use PascalCase names derived from resource names. Export everything.

- "service": An Axios-based service module. Assume a shared configured axios instance imported as: import { api } from "./client". Export one typed function per endpoint (e.g. getUsers, getUserById, createUser), each returning Promise<T> using the types from "types". No console.log, no placeholder TODOs — write real, complete code.

- "postman": A valid Postman Collection v2.1.0 JSON document (as a JSON string, NOT wrapped in extra escaping beyond normal JSON string rules) covering every listed endpoint, with example bodies/query params where known.

- "tests": Vitest + Supertest style integration test file covering the happy path and one failure case (e.g. 404 or 400) per endpoint. Fully runnable structure (describe/it blocks), realistic assertions.

General rules:
- Never wrap your output in \`\`\`json or any other code fence — return raw JSON only.
- Every string value must be valid JSON (escape newlines as \\n, quotes as \\", etc).
- Do not include any keys other than "specTitle" and "artifacts".
- Do not include an artifact whose type was not requested.
- If the spec summary is empty or unusable, still return valid JSON with an artifact of type "docs" whose content explains what's missing — never return an error string outside the JSON envelope.
- Prefer complete, realistic, idiomatic TypeScript/Markdown/JSON over short placeholders. Aim for genuinely useful output a developer could paste into a real project.`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Fetches the raw spec and condenses it into a compact, token-friendly summary. */
async function fetchAndCondenseSpec(swaggerUrl: string): Promise<{
  specTitle: string;
  summaryText: string;
}> {
  const { data } = await axios.get(swaggerUrl, {
    timeout: 10_000,
    headers: { Accept: "application/json" },
  });

  const spec = typeof data === "string" ? JSON.parse(data) : data;
  const specTitle: string = spec?.info?.title || "API";
  const paths = spec?.paths || {};

  const lines: string[] = [];
  const pathEntries = Object.entries(paths);
  const MAX_ENDPOINTS = 60;
  let count = 0;

  for (const [path, methodsObj] of pathEntries) {
    if (count >= MAX_ENDPOINTS) break;
    const methods = methodsObj as Record<string, any>;
    for (const [method, def] of Object.entries(methods)) {
      if (count >= MAX_ENDPOINTS) break;
      if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;

      const params = (def.parameters || [])
        .map((p: any) => `${p.name}:${p.schema?.type || p.type || "any"}${p.required ? "*" : ""}`)
        .join(", ");

      const reqBody =
        def.requestBody?.content?.["application/json"]?.schema
          ? summarizeSchema(def.requestBody.content["application/json"].schema, spec)
          : "";

      const okResponse =
        def.responses?.["200"]?.content?.["application/json"]?.schema ||
        def.responses?.["201"]?.content?.["application/json"]?.schema;
      const responseShape = okResponse ? summarizeSchema(okResponse, spec) : "";

      lines.push(
        `${method.toUpperCase()} ${path}${def.summary ? ` — ${def.summary}` : ""}\n` +
          (params ? `  params: ${params}\n` : "") +
          (reqBody ? `  body: ${reqBody}\n` : "") +
          (responseShape ? `  response: ${responseShape}\n` : "")
      );
      count++;
    }
  }

  const truncatedNote =
    pathEntries.length > MAX_ENDPOINTS
      ? `\n(NOTE: spec has more endpoints than shown; truncated to ${MAX_ENDPOINTS})`
      : "";

  return {
    specTitle,
    summaryText: `API: ${specTitle}\n\n${lines.join("\n")}${truncatedNote}`,
  };
}

/** Very small $ref-aware schema summarizer, kept shallow on purpose to save tokens. */
function summarizeSchema(schema: any, spec: any, depth = 0): string {
  if (!schema || depth > 2) return "object";
  if (schema.$ref) {
    const refName = schema.$ref.split("/").pop();
    const resolved = spec?.components?.schemas?.[refName];
    return resolved ? `${refName}{${summarizeSchema(resolved, spec, depth + 1)}}` : refName;
  }
  if (schema.type === "array") {
    return `${summarizeSchema(schema.items, spec, depth + 1)}[]`;
  }
  if (schema.type === "object" || schema.properties) {
    const props = Object.entries(schema.properties || {})
      .slice(0, 8)
      .map(([k, v]: [string, any]) => `${k}:${v.type || "object"}`)
      .join(", ");
    return props || "object";
  }
  return schema.type || "any";
}

/** Calls Groq with the condensed spec and returns validated artifacts. */
async function generateArtifactsFromSummary(
  summaryText: string,
  types: ArtifactType[]
): Promise<{ specTitle?: string; artifacts: ApiArtifact[] }> {
  const userPrompt = `Generate artifacts for these types, in this order: ${types.join(
    ", "
  )}.\n\nHere is the condensed API spec:\n\n${summaryText}`;

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.2,
    max_tokens: 8000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "";
  const parsed = safeParseJson(raw);

  if (!parsed || !Array.isArray(parsed.artifacts)) {
    throw new Error("Groq returned an unexpected response shape");
  }

  const artifacts: ApiArtifact[] = parsed.artifacts
    .filter((a: any) => a && typeof a.type === "string" && typeof a.content === "string")
    .map((a: any) => buildArtifact(a.type, a.content));

  if (artifacts.length === 0) {
    throw new Error("Groq did not return any usable artifacts");
  }

  return { specTitle: parsed.specTitle, artifacts };
}

function buildArtifact(type: ArtifactType, content: string): ApiArtifact {
  const meta = ARTIFACT_SPECS[type] || ARTIFACT_SPECS.docs;
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: meta.name,
    type,
    status: "ready",
    preview: content.slice(0, 220),
    content,
    language: meta.language,
  };
}

/** Parses model output defensively — strips stray fences if the model adds them anyway. */
function safeParseJson(raw: string): any | null {
  const cleaned = raw.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

const ALL_TYPES: ArtifactType[] = ["docs", "hooks", "types", "service", "postman", "tests"];

/* ------------------------------------------------------------------ */
/*  Controllers                                                        */
/* ------------------------------------------------------------------ */

/**
 * POST /api/api-agent/generate
 * body: { swaggerUrl: string, userId?: string }
 * Generates all 6 artifacts fresh and upserts the session in MongoDB.
 */
export async function generateArtifacts(req: Request, res: Response) {
  try {
    const { swaggerUrl, userId } = req.body as { swaggerUrl?: string; userId?: string };

    if (!swaggerUrl || typeof swaggerUrl !== "string") {
      return res.status(400).json({ success: false, message: "swaggerUrl is required" });
    }

    let summaryText: string;
    let specTitle: string;
    try {
      const condensed = await fetchAndCondenseSpec(swaggerUrl);
      summaryText = condensed.summaryText;
      specTitle = condensed.specTitle;
    } catch (err: any) {
      return res.status(422).json({
        success: false,
        message: `Could not fetch or parse the OpenAPI spec at that URL: ${err.message}`,
      });
    }

    const { specTitle: aiTitle, artifacts } = await generateArtifactsFromSummary(
      summaryText,
      ALL_TYPES
    );

    const session = await ApiAgentSession.findOneAndUpdate(
      { swaggerUrl, userId: userId || null },
      {
        swaggerUrl,
        userId: userId || null,
        specTitle: aiTitle || specTitle,
        artifacts,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      sessionId: session._id,
      specTitle: session.specTitle,
      artifacts: session.artifacts,
    });
  } catch (err: any) {
    console.error("[apiAgent.generateArtifacts]", err);
    return res.status(500).json({
      success: false,
      message: "Failed to generate artifacts",
      detail: err.message,
    });
  }
}

/**
 * POST /api/api-agent/regenerate
 * body: { swaggerUrl: string, type: ArtifactType, userId?: string }
 * Regenerates a single artifact and patches it into the stored session.
 */
export async function regenerateArtifact(req: Request, res: Response) {
  try {
    const { swaggerUrl, type, userId } = req.body as {
      swaggerUrl?: string;
      type?: ArtifactType;
      userId?: string;
    };

    if (!swaggerUrl || !type || !ALL_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: "swaggerUrl and a valid type are required" });
    }

    const { summaryText } = await fetchAndCondenseSpec(swaggerUrl);
    const { artifacts } = await generateArtifactsFromSummary(summaryText, [type]);
    const newArtifact = artifacts[0];

    const session = await ApiAgentSession.findOneAndUpdate(
      { swaggerUrl, userId: userId || null, "artifacts.type": type },
      { $set: { "artifacts.$": newArtifact } },
      { new: true }
    );

    if (!session) {
      // No existing session/artifact of this type yet — push instead.
      const pushed = await ApiAgentSession.findOneAndUpdate(
        { swaggerUrl, userId: userId || null },
        { $push: { artifacts: newArtifact } },
        { upsert: true, new: true }
      );
      return res.status(200).json({ success: true, artifact: newArtifact, artifacts: pushed.artifacts });
    }

    return res.status(200).json({ success: true, artifact: newArtifact, artifacts: session.artifacts });
  } catch (err: any) {
    console.error("[apiAgent.regenerateArtifact]", err);
    return res.status(500).json({ success: false, message: "Failed to regenerate artifact", detail: err.message });
  }
}

/**
 * GET /api/api-agent/latest?swaggerUrl=...&userId=...
 * Returns the most recent session for a given swaggerUrl (or the latest overall).
 */
export async function getLatestSession(req: Request, res: Response) {
  try {
    const { swaggerUrl, userId } = req.query as { swaggerUrl?: string; userId?: string };
    const filter: Record<string, any> = {};
    if (swaggerUrl) filter.swaggerUrl = swaggerUrl;
    if (userId) filter.userId = userId;

    const session = await ApiAgentSession.findOne(filter).sort({ updatedAt: -1 });

    if (!session) {
      return res.status(200).json({ success: true, session: null });
    }

    return res.status(200).json({
      success: true,
      session: {
        id: session._id,
        swaggerUrl: session.swaggerUrl,
        specTitle: session.specTitle,
        artifacts: session.artifacts,
        updatedAt: session.updatedAt,
      },
    });
  } catch (err: any) {
    console.error("[apiAgent.getLatestSession]", err);
    return res.status(500).json({ success: false, message: "Failed to fetch session", detail: err.message });
  }
}

/**
 * GET /api/api-agent/history?userId=...
 * Lists past sessions (lightweight — no artifact content) for a history panel.
 */
export async function listSessions(req: Request, res: Response) {
  try {
    const { userId } = req.query as { userId?: string };
    const filter: Record<string, any> = {};
    if (userId) filter.userId = userId;

    const sessions = await ApiAgentSession.find(filter)
      .select({ swaggerUrl: 1, specTitle: 1, updatedAt: 1, createdAt: 1 })
      .sort({ updatedAt: -1 })
      .limit(50);

    return res.status(200).json({ success: true, sessions });
  } catch (err: any) {
    console.error("[apiAgent.listSessions]", err);
    return res.status(500).json({ success: false, message: "Failed to list sessions", detail: err.message });
  }
}

/**
 * DELETE /api/api-agent/:sessionId
 */
export async function deleteSession(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    await ApiAgentSession.findByIdAndDelete(sessionId);
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("[apiAgent.deleteSession]", err);
    return res.status(500).json({ success: false, message: "Failed to delete session", detail: err.message });
  }
}

/* ------------------------------------------------------------------ */
/*  Example route wiring (for reference — put this in your routes file)
 *
 *  import { Router } from "express";
 *  import {
 *    generateArtifacts, regenerateArtifact, getLatestSession, listSessions, deleteSession,
 *  } from "./apiagentcontrolller";
 *
 *  const router = Router();
 *  router.post("/api-agent/generate", generateArtifacts);
 *  router.post("/api-agent/regenerate", regenerateArtifact);
 *  router.get("/api-agent/latest", getLatestSession);
 *  router.get("/api-agent/history", listSessions);
 *  router.delete("/api-agent/:sessionId", deleteSession);
 *  export default router;
 * ------------------------------------------------------------------ */