import { Request, Response } from "express";
import axios from "axios";
import Groq from "groq-sdk";
import { User } from "../models/user"; // adjust path to your actual User model
import { DocsSession, IGeneratedDoc, GeneratedDocType } from "../models/documentation";
import { ENV } from "../config/env";

const groq = new Groq({ apiKey: ENV.GROQ_API_KEY });
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GITHUB_API = "https://api.github.com";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface GenerateRequestBody {
  repoId: string | number;
  branch?: string;
}

interface RegenerateRequestBody extends GenerateRequestBody {
  type: GeneratedDocType;
}

interface GithubRepoInfo {
  owner: string;
  repo: string;
  defaultBranch: string;
}

interface GithubTreeEntry {
  path: string;
  type: "blob" | "tree";
  size?: number;
}

interface LLMDoc {
  type: string;
  title?: string;
  content: string;
}

interface LLMOutput {
  documents: LLMDoc[];
}

// -----------------------------------------------------------------------------
// Config — token budgets are conservative on purpose: this Groq tier caps
// llama-3.3-70b-versatile at a small TPM (tokens/minute) allowance, and a
// generation call here produces up to 4 full documents, so both the input
// context AND the completion budget need headroom left for each other.
// -----------------------------------------------------------------------------

const MAX_TREE_ENTRIES = Number(process.env.DOCS_MAX_TREE_ENTRIES) || 150;
const MAX_SIGNAL_FILES = Number(process.env.DOCS_MAX_SIGNAL_FILES) || 14;
const MAX_FILE_CHARS = Number(process.env.DOCS_MAX_FILE_CHARS) || 2000;
const MAX_TOTAL_CONTEXT_CHARS = Number(process.env.DOCS_MAX_TOTAL_CONTEXT_CHARS) || 15000;

const GROQ_TEMPERATURE = 0.25;
const GROQ_SEED = 42;
const GROQ_COMPLETION_TOKENS = Number(process.env.GROQ_DOCS_COMPLETION_TOKENS) || 3500;
const GROQ_MAX_RETRIES = 2;
const GROQ_SHRINK_FACTOR = 0.6;
const GROQ_MAX_MINUTE_WAIT_MS = 8000; // only worth auto-waiting out short per-minute limits

const DOC_ORDER: GeneratedDocType[] = ["readme", "api", "architecture", "flow"];

const DOC_META: Record<GeneratedDocType, { title: string }> = {
  readme: { title: "README.md" },
  api: { title: "API Reference" },
  architecture: { title: "Architecture Overview" },
  flow: { title: "Data Flow Diagram" },
};

const IGNORED_PATH_SEGMENTS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  "public",
  "assets",
  "vendor",
  ".lock",
];

// Files that actually tell us what the product does and how it's wired —
// prioritized over reading arbitrary source files.
const SIGNAL_FILE_MATCHERS: RegExp[] = [
  /(^|\/)package\.json$/,
  /(^|\/)README\.md$/i,
  /(^|\/)requirements\.txt$/,
  /(^|\/)go\.mod$/,
  /controller/i,
  /route/i,
  /(^|\/)(api|server|app|index|main)\.(ts|js)$/i,
  /model/i,
  /\.env\.example$/i,
];

const SYSTEM_INSTRUCTION = `You are Aether Docs AI, a senior technical writer and software architect.

You will be given a repository's directory listing plus the contents of its most informative files (manifest, entry point, routes/controllers, models, and any existing README).

Your job is to generate exactly four documentation artifacts, each grounded ONLY in evidence from the provided context. Never invent features, endpoints, environment variables, or architectural components that aren't evidenced. If something is genuinely unclear, describe what IS evidenced rather than guessing at business purpose.

1. "readme": A complete README.md.
   - Project name and a one-paragraph description (from package.json's name/description if present, otherwise inferred conservatively from the code's actual structure/routes — never invent a marketing pitch).
   - Detected tech stack (languages, frameworks, key dependencies actually seen in the manifest).
   - Prerequisites and installation steps using the ACTUAL package manager evidenced (npm/yarn/pnpm — infer from lockfile name if shown, else default to npm).
   - Available scripts, taken directly from package.json's "scripts" if present.
   - Environment variables required, taken from any .env.example shown — omit this section if none was provided.
   - A short "Project Structure" section summarizing the real top-level directories from the listing.

2. "api": An API reference in Markdown.
   - Enumerate the ACTUAL endpoints found in the provided route/controller files: method, path, and a one-line description inferred from the handler's name/logic.
   - Group related endpoints under a heading per resource/domain.
   - If no route/controller files were provided or none were found, say so explicitly instead of fabricating endpoints.

3. "architecture": An Architecture Overview in Markdown.
   - Describe the real components evidenced by the directory structure and files shown (e.g. "Express API layer", "Mongoose models", "React frontend") — do not describe infrastructure (queues, caches, specific cloud services) that isn't evidenced anywhere in the context.
   - Note any notable patterns actually observed (e.g. controller/service/model layering, a monorepo layout).

4. "flow": A Markdown document containing a Mermaid flowchart (inside a \`\`\`mermaid code fence) of the primary request/data flow implied by the evidenced routes and layers, followed by 2-3 sentences explaining it. Keep the diagram to the handful of components actually evidenced — do not pad it with invented services.

Rules for all four:
- Every claim must trace back to something in the provided context. When genuinely uncertain, state the uncertainty plainly rather than inventing detail.
- Write complete, polished Markdown — no placeholders, no "TODO", no lorem ipsum.
- Keep each document focused and reasonably concise; this is documentation someone will actually read, not a maximal dump.

You must output STRICT JSON and nothing else, matching exactly this schema, with all four documents present in this exact order:
{
  "documents": [
    { "type": "readme", "content": "string" },
    { "type": "api", "content": "string" },
    { "type": "architecture", "content": "string" },
    { "type": "flow", "content": "string" }
  ]
}

Never output markdown fences around the JSON itself. Never output explanations or commentary outside the JSON object. Every string must be valid JSON (escape newlines as \\n, quotes as \\", etc). Return only valid JSON.`;

// -----------------------------------------------------------------------------
// Helpers: GitHub
// -----------------------------------------------------------------------------

function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function fetchRepoById(repoId: string | number, token: string): Promise<GithubRepoInfo> {
  try {
    const { data } = await axios.get(`${GITHUB_API}/repositories/${repoId}`, {
      headers: githubHeaders(token),
    });
    return { owner: data.owner?.login, repo: data.name, defaultBranch: data.default_branch };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      throw new Error("Repository not found or not accessible with the connected GitHub account");
    }
    throw err;
  }
}

async function fetchRepoTree(
  owner: string,
  repo: string,
  branch: string,
  token: string
): Promise<GithubTreeEntry[]> {
  const { data } = await axios.get(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: githubHeaders(token) }
  );
  return (data.tree as GithubTreeEntry[]) || [];
}

async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token: string
): Promise<string | null> {
  try {
    const { data } = await axios.get(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${branch}`,
      { headers: githubHeaders(token) }
    );
    if (!data.content || data.encoding !== "base64") return null;
    const decoded = Buffer.from(data.content, "base64").toString("utf-8");
    return decoded.length > MAX_FILE_CHARS ? decoded.slice(0, MAX_FILE_CHARS) + "\n<!-- truncated -->" : decoded;
  } catch (err) {
    console.warn(`[docs] failed to fetch ${path}:`, (err as Error).message);
    return null;
  }
}

function isIgnoredPath(path: string): boolean {
  const lower = path.toLowerCase();
  return IGNORED_PATH_SEGMENTS.some((seg) => lower.includes(seg));
}

function isSignalFile(path: string): boolean {
  return SIGNAL_FILE_MATCHERS.some((re) => re.test(path));
}

async function buildDocsContext(
  owner: string,
  repo: string,
  branch: string,
  token: string
): Promise<string> {
  const tree = await fetchRepoTree(owner, repo, branch, token);
  const visiblePaths = tree.filter((e) => e.type === "blob" && !isIgnoredPath(e.path)).map((e) => e.path);

  const treeListing = visiblePaths.slice(0, MAX_TREE_ENTRIES).join("\n");
  const treeNote =
    visiblePaths.length > MAX_TREE_ENTRIES
      ? `\n(NOTE: ${visiblePaths.length - MAX_TREE_ENTRIES} more files not shown)`
      : "";

  const signalPaths = visiblePaths.filter(isSignalFile).slice(0, MAX_SIGNAL_FILES);

  const fileSections: string[] = [];
  let totalChars = 0;

  for (const path of signalPaths) {
    if (totalChars >= MAX_TOTAL_CONTEXT_CHARS) break;
    const content = await fetchFileContent(owner, repo, path, branch, token);
    if (content === null) continue;
    const section = `// FILE: ${path}\n${content}\n// END FILE: ${path}`;
    totalChars += section.length;
    fileSections.push(section);
  }

  return [
    `Directory listing (${visiblePaths.length} files total):`,
    treeListing + treeNote,
    "",
    "Key file contents:",
    fileSections.length > 0 ? fileSections.join("\n\n") : "(none of the expected signal files were found)",
  ].join("\n");
}

// -----------------------------------------------------------------------------
// Helpers: Groq response parsing / validation
// -----------------------------------------------------------------------------

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

function isValidLLMOutput(value: any, expectedTypes: string[]): value is LLMOutput {
  if (!value || !Array.isArray(value.documents)) return false;
  const returnedTypes = value.documents.map((d: any) => d?.type);
  return (
    expectedTypes.every((t) => returnedTypes.includes(t)) &&
    value.documents.every(
      (d: any) => d && typeof d.type === "string" && typeof d.content === "string" && d.content.trim().length > 0
    )
  );
}

// -----------------------------------------------------------------------------
// Helpers: unified Groq rate-limit / oversized-request classification
// -----------------------------------------------------------------------------

type GroqErrorKind = "request_too_large" | "rate_limit_day" | "rate_limit_minute" | "other";

interface GroqErrorInfo {
  kind: GroqErrorKind;
  message: string;
  retryAfterSeconds?: number;
}

function parseRetryAfterSeconds(message: string): number | undefined {
  const match = message.match(/try again in\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+(?:\.\d+)?)s)?/i);
  if (!match) return undefined;
  const total = Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
  return total > 0 ? Math.ceil(total) : undefined;
}

function classifyGroqError(err: unknown): GroqErrorInfo {
  const apiError = (err as any)?.error?.error ?? (err as any)?.error;
  const code = apiError?.code;
  const message: string = apiError?.message || (err as Error)?.message || "Unknown Groq error";

  if (code !== "rate_limit_exceeded") {
    return { kind: "other", message };
  }

  // "Request too large" = a single call exceeded the per-minute cap outright —
  // shrinking the payload and retrying immediately actually helps here.
  if (/request too large/i.test(message)) {
    return { kind: "request_too_large", message, retryAfterSeconds: parseRetryAfterSeconds(message) };
  }

  // "Rate limit reached ... tokens per day" = cumulative daily budget is gone.
  // Retrying (with or without a smaller payload) won't help until it resets.
  if (/tokens per day|TPD/i.test(message)) {
    return { kind: "rate_limit_day", message, retryAfterSeconds: parseRetryAfterSeconds(message) };
  }

  // "Rate limit reached ... tokens per minute" = cumulative usage this minute
  // is gone (as opposed to this single request being oversized). Short waits
  // are worth it; shrinking the payload doesn't address the actual cause.
  return { kind: "rate_limit_minute", message, retryAfterSeconds: parseRetryAfterSeconds(message) };
}

function shrinkPrompt(prompt: string, factor: number): string {
  const marker = "\nDirectory listing (";
  const markerIndex = prompt.indexOf(marker);
  if (markerIndex === -1) return prompt.slice(0, Math.floor(prompt.length * factor));
  const header = prompt.slice(0, markerIndex);
  const contextSection = prompt.slice(markerIndex);
  const shrunk = contextSection.slice(0, Math.floor(contextSection.length * factor));
  return `${header}${shrunk}\n<!-- context truncated further to fit the token budget -->`;
}

// -----------------------------------------------------------------------------
// Groq call
// -----------------------------------------------------------------------------

async function callGroqForDocs(
  contextText: string,
  owner: string,
  repo: string,
  branch: string,
  requestedTypes: GeneratedDocType[]
): Promise<LLMDoc[]> {
  if (!ENV.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured on the server");
  }

  let currentContext = contextText;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= GROQ_MAX_RETRIES; attempt++) {
    const basePrompt = `Repository: ${owner}/${repo}\nBranch: ${branch}\nGenerate documents for these types, in this exact order: ${requestedTypes.join(
      ", "
    )}.\n\n${currentContext}`;

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
                ? basePrompt
                : `${basePrompt}\n\nYour previous response was not valid JSON matching the required schema (all ${requestedTypes.length} document type(s) with non-empty content, in order). Return ONLY the raw JSON object this time.`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content || "";
      const parsed = safeParseJson(raw);

      if (isValidLLMOutput(parsed, requestedTypes)) {
        return parsed.documents;
      }

      lastError = new Error("Groq returned a response that did not match the expected schema");
    } catch (err) {
      const info = classifyGroqError(err);

      if (info.kind === "request_too_large") {
        console.warn(`[docs] attempt ${attempt}: request too large, shrinking context and retrying.`);
        currentContext = shrinkPrompt(currentContext, GROQ_SHRINK_FACTOR);
        lastError = Object.assign(new Error(info.message), { groqError: info });
        continue;
      }

      if (info.kind === "rate_limit_day") {
        // No point retrying — surface immediately with the real wait time.
        throw Object.assign(new Error(info.message), { groqError: info });
      }

      if (info.kind === "rate_limit_minute") {
        const waitMs = info.retryAfterSeconds ? info.retryAfterSeconds * 1000 : 3000;
        if (waitMs <= GROQ_MAX_MINUTE_WAIT_MS && attempt < GROQ_MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          lastError = Object.assign(new Error(info.message), { groqError: info });
          continue;
        }
        throw Object.assign(new Error(info.message), { groqError: info });
      }

      lastError = err;
      console.warn(`[docs] Groq call attempt ${attempt} failed:`, (err as Error).message);
    }
  }

  throw lastError || new Error("Groq returned an empty or invalid response");
}

// -----------------------------------------------------------------------------
// Mapping
// -----------------------------------------------------------------------------

function normalizeDocType(type: string): GeneratedDocType | null {
  const lower = (type || "").toLowerCase().trim() as GeneratedDocType;
  return (DOC_ORDER as string[]).includes(lower) ? lower : null;
}

function buildDoc(type: GeneratedDocType, content: string, index: number): IGeneratedDoc {
  return {
    id: `${type}-${Date.now()}-${index}`,
    title: DOC_META[type].title,
    type,
    status: "ready",
    content,
    preview: content,
  };
}

function serializeSession(doc: InstanceType<typeof DocsSession>) {
  return {
    id: doc._id.toString(),
    repoId: doc.repoId,
    owner: doc.owner,
    repoName: doc.repoName,
    branch: doc.branch,
    documents: doc.documents,
    model: doc.model,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function rateLimitResponse(res: Response, info: GroqErrorInfo) {
  if (info.retryAfterSeconds) {
    res.set("Retry-After", String(info.retryAfterSeconds));
  }
  return res.status(429).json({
    success: false,
    message:
      info.kind === "rate_limit_day"
        ? "Daily AI generation budget has been used up for today. Try again later."
        : "Documentation generation is temporarily rate-limited. Try again in a moment.",
    scope: info.kind === "rate_limit_day" ? "day" : "minute",
    retryAfterSeconds: info.retryAfterSeconds,
  });
}

// -----------------------------------------------------------------------------
// Controllers
// -----------------------------------------------------------------------------

/**
 * POST /api/docs/generate
 * body: { userId, repoId, branch? }
 */
export async function generateDocs(req: Request, res: Response) {
  try {
    const { userId, repoId, branch }: GenerateRequestBody & { userId?: string } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!repoId) {
      return res.status(400).json({ success: false, message: "repoId is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (!user.githubConnected || !user.githubAccessToken) {
      return res.status(400).json({
        success: false,
        message: "Connect your GitHub account before generating documentation",
      });
    }

    const token = user.githubAccessToken;

    let owner: string, repo: string, defaultBranch: string;
    try {
      const repoInfo = await fetchRepoById(repoId, token);
      owner = repoInfo.owner;
      repo = repoInfo.repo;
      defaultBranch = repoInfo.defaultBranch;
    } catch (err) {
      return res.status(404).json({
        success: false,
        message: (err as Error).message || "Repository could not be resolved",
      });
    }

    const resolvedBranch = branch || defaultBranch;
    const contextText = await buildDocsContext(owner, repo, resolvedBranch, token);

    let llmDocs: LLMDoc[];
    try {
      llmDocs = await callGroqForDocs(contextText, owner, repo, resolvedBranch, DOC_ORDER);
    } catch (err: any) {
      const info: GroqErrorInfo | undefined = err?.groqError;
      if (info && (info.kind === "rate_limit_day" || info.kind === "rate_limit_minute")) {
        return rateLimitResponse(res, info);
      }

      await DocsSession.findOneAndUpdate(
        { user: userId, repoId: String(repoId) },
        {
          user: userId,
          repoId: String(repoId),
          owner,
          repoName: repo,
          branch: resolvedBranch,
          model: GROQ_MODEL,
          status: "failed",
          errorMessage: err?.message || "AI generation failed",
        },
        { upsert: true }
      );

      return res.status(502).json({ success: false, message: err?.message || "AI generation failed" });
    }

    const documents = llmDocs
      .map((d, i) => {
        const type = normalizeDocType(d.type);
        return type ? buildDoc(type, d.content, i) : null;
      })
      .filter((d): d is IGeneratedDoc => d !== null);

    const session = await DocsSession.findOneAndUpdate(
      { user: userId, repoId: String(repoId) },
      {
        user: userId,
        repoId: String(repoId),
        owner,
        repoName: repo,
        branch: resolvedBranch,
        documents,
        model: GROQ_MODEL,
        status: "completed",
        errorMessage: "",
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({ success: true, session: serializeSession(session) });
  } catch (err: any) {
    console.error("[docs.generateDocs]", err);
    return res.status(500).json({ success: false, message: err?.message || "Documentation generation failed" });
  }
}

/**
 * POST /api/docs/regenerate
 * body: { userId, repoId, branch?, type }
 */
export async function regenerateDoc(req: Request, res: Response) {
  try {
    const { userId, repoId, branch, type }: RegenerateRequestBody & { userId?: string } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!repoId || !type || !normalizeDocType(type)) {
      return res.status(400).json({ success: false, message: "repoId and a valid document type are required" });
    }

    const user = await User.findById(userId);
    if (!user?.githubAccessToken) {
      return res.status(400).json({ success: false, message: "Connect your GitHub account first" });
    }

    const token = user.githubAccessToken;
    const repoInfo = await fetchRepoById(repoId, token);
    const resolvedBranch = branch || repoInfo.defaultBranch;

    const contextText = await buildDocsContext(repoInfo.owner, repoInfo.repo, resolvedBranch, token);

    let llmDocs: LLMDoc[];
    try {
      llmDocs = await callGroqForDocs(contextText, repoInfo.owner, repoInfo.repo, resolvedBranch, [type]);
    } catch (err: any) {
      const info: GroqErrorInfo | undefined = err?.groqError;
      if (info && (info.kind === "rate_limit_day" || info.kind === "rate_limit_minute")) {
        return rateLimitResponse(res, info);
      }
      return res.status(502).json({ success: false, message: err?.message || "AI generation failed" });
    }

    const newDoc = buildDoc(type, llmDocs[0].content, 0);

    const patched = await DocsSession.findOneAndUpdate(
      { user: userId, repoId: String(repoId), "documents.type": type },
      { $set: { "documents.$": newDoc } },
      { new: true }
    );

    const session =
      patched ||
      (await DocsSession.findOneAndUpdate(
        { user: userId, repoId: String(repoId) },
        {
          $push: { documents: newDoc },
          $setOnInsert: {
            owner: repoInfo.owner,
            repoName: repoInfo.repo,
            branch: resolvedBranch,
            model: GROQ_MODEL,
            status: "completed",
          },
        },
        { upsert: true, new: true }
      ));

    return res.status(200).json({ success: true, document: newDoc, session: serializeSession(session!) });
  } catch (err: any) {
    console.error("[docs.regenerateDoc]", err);
    return res.status(500).json({ success: false, message: err?.message || "Failed to regenerate document" });
  }
}

/**
 * GET /api/docs/latest?repoId=...
 */
export async function getLatestDocsSession(req: Request, res: Response) {
  try {
    const userId = (req.query.userId as string) || (req.body as any)?.userId;
    const { repoId } = req.query as { repoId?: string };

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!repoId) {
      return res.status(400).json({ success: false, message: "repoId is required" });
    }

    const session = await DocsSession.findOne({ user: userId, repoId: String(repoId) });
    return res.status(200).json({ success: true, session: session ? serializeSession(session) : null });
  } catch (err: any) {
    console.error("[docs.getLatestDocsSession]", err);
    return res.status(500).json({ success: false, message: "Failed to fetch documentation session" });
  }
}