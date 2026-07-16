import type { Request, Response } from "express";
import Groq from "groq-sdk";
import { ENV } from "../config/env";

const groq = new Groq({ apiKey: ENV.GROQ_API_KEY });
const GROQ_MODEL = "llama-3.3-70b-versatile";

// -----------------------------------------------------------------------------
// Types (mirrors the frontend's ArchitectureNode / ArchitectureResult contract)
// -----------------------------------------------------------------------------

type NodeType = "frontend" | "gateway" | "service" | "database" | "cache" | "queue";

interface ArchitectureNode {
  id: string;
  label: string;
  type: NodeType;
  description?: string;
  tech?: string;
}

interface ArchitectureResult {
  prompt: string;
  systemTitle: string;
  summary: string;
  nodes: ArchitectureNode[];
  suggestions: string[];
}

interface LLMNode {
  id?: string;
  label?: string;
  type?: string;
  description?: string;
  tech?: string;
}

interface LLMOutput {
  systemTitle?: string;
  summary?: string;
  nodes?: LLMNode[];
  suggestions?: string[];
}

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

const VALID_NODE_TYPES: NodeType[] = ["frontend", "gateway", "service", "database", "cache", "queue"];
const MAX_NODES = 14;
const MIN_NODES = 5;
const MAX_SUGGESTIONS = 7;
const MAX_PROMPT_CHARS = 400;

const GROQ_TEMPERATURE = 0.35; // some creative range is fine here, but kept low for consistent, sane architectures
const GROQ_SEED = 42;
const GROQ_COMPLETION_TOKENS = 2200;
const GROQ_MAX_RETRIES = 2;

const FALLBACK_SUGGESTIONS = [
  "E-commerce Platform",
  "Ride-Hailing App",
  "Video Streaming Service",
  "SaaS Analytics Dashboard",
  "Real-time Chat App",
  "Food Delivery Platform",
  "Social Media Feed",
];

// -----------------------------------------------------------------------------
// System instruction
// -----------------------------------------------------------------------------

const SYSTEM_INSTRUCTION = `You are Aether Architecture AI, a Staff Solutions Architect who designs production-grade, real-world system architectures from a short product description.

You will be given a single product/feature description (e.g. "Build Uber Clone", "SaaS Dashboard"). You must design a realistic, coherent backend + frontend architecture for that product.

Rules for the architecture:
- Produce between ${MIN_NODES} and ${MAX_NODES} nodes total. Fewer, well-chosen nodes are better than padding the diagram with redundant services.
- Every node's "type" MUST be exactly one of: "frontend", "gateway", "service", "database", "cache", "queue". Never invent a new type. If something doesn't cleanly fit, pick the closest of these six (e.g. a CDN or load balancer is "gateway"; a search index or object store is "database"; a pub/sub broker or event bus is "queue").
- Order the "nodes" array top-to-bottom the way a request actually flows through the system: client-facing frontend(s) first, then API gateway/edge, then backend services (one node per distinct bounded-context service — do not split a single responsibility into multiple nodes, and do not merge unrelated responsibilities into one node), then supporting infrastructure (cache, queue), then databases last. This order is what gets rendered directly as a vertical flow diagram, so the order must make architectural sense on its own.
- Node "label" must be a short, specific, human-readable name (2-4 words), e.g. "Driver Location Service", "Ride Matching Service", "Postgres (Rides DB)" — not generic placeholders like "Service 1" or "Backend".
- Node "id" must be "n1", "n2", "n3", ... in the same order as the array, no gaps, no reuse.
- "description" (optional but strongly preferred): one short sentence on what that specific node is responsible for in THIS product's context — be specific to the domain, not generic boilerplate.
- "tech" (optional): a realistic concrete technology choice for that node when relevant (e.g. "PostgreSQL", "Redis", "Kafka", "React Native", "Kong / NGINX"). Omit if not meaningful for that node type.
- Do not include authentication as a separate database unless the product genuinely needs a dedicated user store distinct from its primary database — avoid redundant nodes.
- Base every decision on what THIS specific product actually needs. Do not reuse a generic template architecture across unrelated prompts — a chat app, an e-commerce platform, and a video streaming service should look meaningfully different from each other.

Rules for "suggestions":
- Provide at most ${MAX_SUGGESTIONS} short suggestion strings (2-5 words each, Title Case, e.g. "Food Delivery Platform", "Real-time Bidding System").
- Each suggestion is a DIFFERENT product idea (not a variation or enhancement of the current one) that a developer exploring this kind of system design might also want to see architected next. Keep them in a similar domain/complexity tier to the current prompt, but genuinely distinct products — never repeat or rephrase the user's own prompt.
- No duplicates. No trailing punctuation. No numbering.

Rules for "summary":
- One to two sentences, plain language, explaining the overall shape of the architecture and the key data flow — written for someone about to look at the diagram, not a generic description of microservices in general.

Rules for "systemTitle":
- A short, specific title for this architecture, e.g. "Ride-Hailing Platform Architecture" (not just a copy of the raw prompt).

You must output STRICT JSON and nothing else, matching exactly this schema:
{
  "systemTitle": "string",
  "summary": "string",
  "nodes": [
    {
      "id": "n1",
      "label": "string",
      "type": "frontend | gateway | service | database | cache | queue",
      "description": "string",
      "tech": "string"
    }
  ],
  "suggestions": ["string", "..."]
}

Never output markdown. Never output explanations. Never output conversational text outside the JSON object. Return only valid JSON. Every string must be valid JSON (escape newlines as \\n, quotes as \\", etc).`;

// -----------------------------------------------------------------------------
// Helpers: response parsing / validation
// -----------------------------------------------------------------------------

function safeParseJson(raw: string): any | null {
  const cleaned = raw
    .trim()
    .replace(/^```(json)?/i, "")
    .replace(/```$/, "")
    .trim();
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

function isValidLLMOutput(value: any): value is LLMOutput {
  return (
    !!value &&
    typeof value.systemTitle === "string" &&
    typeof value.summary === "string" &&
    value.summary.trim().length > 0 &&
    Array.isArray(value.nodes) &&
    value.nodes.length > 0 &&
    value.nodes.every((n: any) => n && typeof n.label === "string" && typeof n.type === "string")
  );
}

function normalizeNodeType(type: string): NodeType {
  const lower = (type || "").toLowerCase().trim();
  return (VALID_NODE_TYPES as string[]).includes(lower) ? (lower as NodeType) : "service";
}

function mapNodes(nodes: LLMNode[]): ArchitectureNode[] {
  return nodes.slice(0, MAX_NODES).map((n, i) => ({
    id: `n${i + 1}`,
    label: (n.label || `Node ${i + 1}`).trim(),
    type: normalizeNodeType(n.type || "service"),
    description: n.description?.trim() || undefined,
    tech: n.tech?.trim() || undefined,
  }));
}

function mapSuggestions(suggestions: string[] | undefined, prompt: string): string[] {
  if (!Array.isArray(suggestions)) return FALLBACK_SUGGESTIONS.slice(0, MAX_SUGGESTIONS);

  const seen = new Set<string>();
  const promptLower = prompt.trim().toLowerCase();
  const cleaned: string[] = [];

  for (const raw of suggestions) {
    if (typeof raw !== "string") continue;
    const s = raw.trim().replace(/[.]+$/, "");
    const key = s.toLowerCase();
    if (!s || key === promptLower || seen.has(key)) continue;
    seen.add(key);
    cleaned.push(s);
    if (cleaned.length >= MAX_SUGGESTIONS) break;
  }

  return cleaned.length > 0 ? cleaned : FALLBACK_SUGGESTIONS.slice(0, MAX_SUGGESTIONS);
}

// -----------------------------------------------------------------------------
// Helpers: Groq rate-limit detection (mirrors the other Aether AI controllers)
// -----------------------------------------------------------------------------

interface GroqRateLimitInfo {
  isRateLimited: boolean;
  scope: "day" | "minute" | "unknown";
  retryAfterSeconds?: number;
  message: string;
}

function parseRetryAfterSeconds(message: string): number | undefined {
  const match = message.match(/try again in\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+(?:\.\d+)?)s)?/i);
  if (!match) return undefined;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? Math.ceil(total) : undefined;
}

function inspectGroqError(err: unknown): GroqRateLimitInfo {
  const status = (err as any)?.status ?? (err as any)?.response?.status;
  const apiError = (err as any)?.error?.error ?? (err as any)?.error;
  const code = apiError?.code;
  const message: string = apiError?.message || (err as Error)?.message || "Unknown Groq error";

  if (status !== 429 && code !== "rate_limit_exceeded") {
    return { isRateLimited: false, scope: "unknown", message };
  }

  const scope: "day" | "minute" | "unknown" = /tokens per day|TPD/i.test(message)
    ? "day"
    : /tokens per minute|TPM/i.test(message)
    ? "minute"
    : "unknown";

  return { isRateLimited: true, scope, retryAfterSeconds: parseRetryAfterSeconds(message), message };
}

// -----------------------------------------------------------------------------
// Groq call
// -----------------------------------------------------------------------------

async function generateArchitectureFromPrompt(prompt: string): Promise<LLMOutput> {
  if (!ENV.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured on the server");
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= GROQ_MAX_RETRIES; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        temperature: GROQ_TEMPERATURE,
        seed: GROQ_SEED,
        max_tokens: GROQ_COMPLETION_TOKENS,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          {
            role: "user",
            content:
              attempt === 1
                ? `Design an architecture for: "${prompt}"`
                : `Design an architecture for: "${prompt}"\n\nYour previous response was not valid JSON matching the required schema. Return ONLY the raw JSON object this time — no markdown, no commentary, no missing fields.`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content || "";
      const parsed = safeParseJson(raw);

      if (isValidLLMOutput(parsed)) {
        return parsed;
      }

      lastError = new Error("Groq returned a response that did not match the expected schema");
    } catch (err) {
      const rateLimitInfo = inspectGroqError(err);

      if (rateLimitInfo.isRateLimited) {
        // Not worth retrying a rate-limit error with an identical request —
        // surface it immediately with an accurate retry time.
        throw Object.assign(new Error(rateLimitInfo.message), { groqRateLimit: rateLimitInfo });
      }

      lastError = err;
      console.warn(`[architecture] Groq call attempt ${attempt} failed:`, (err as Error).message);
    }
  }

  throw lastError || new Error("Groq returned an empty or invalid response");
}

// -----------------------------------------------------------------------------
// Controller
// -----------------------------------------------------------------------------

/**
 * POST /api/architecture/generate
 * body: { prompt: string }
 */
export async function generateArchitecture(req: Request, res: Response) {
  try {
    const { prompt } = req.body as { prompt?: string };

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, message: "prompt is required" });
    }

    const trimmedPrompt = prompt.trim().slice(0, MAX_PROMPT_CHARS);

    let llmResult: LLMOutput;
    try {
      llmResult = await generateArchitectureFromPrompt(trimmedPrompt);
    } catch (err: any) {
      const rateLimit: GroqRateLimitInfo | undefined = err?.groqRateLimit;

      if (rateLimit?.isRateLimited) {
        if (rateLimit.retryAfterSeconds) {
          res.set("Retry-After", String(rateLimit.retryAfterSeconds));
        }
        return res.status(429).json({
          success: false,
          message:
            rateLimit.scope === "day"
              ? "Daily AI generation budget has been used up for today. Try again later."
              : "Architecture generation is temporarily rate-limited. Try again in a moment.",
          scope: rateLimit.scope,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        });
      }

      return res.status(502).json({
        success: false,
        message: err?.message || "Failed to generate architecture",
      });
    }

    const nodes = mapNodes(llmResult.nodes || []);
    if (nodes.length === 0) {
      return res.status(502).json({
        success: false,
        message: "AI did not return any architecture nodes",
      });
    }

    const architecture: ArchitectureResult = {
      prompt: trimmedPrompt,
      systemTitle: llmResult.systemTitle?.trim() || trimmedPrompt,
      summary: llmResult.summary?.trim() || "",
      nodes,
      suggestions: mapSuggestions(llmResult.suggestions, trimmedPrompt),
    };

    return res.status(200).json({ success: true, architecture });
  } catch (err: any) {
    console.error("[architecture.generateArchitecture]", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "Architecture generation failed",
    });
  }
}