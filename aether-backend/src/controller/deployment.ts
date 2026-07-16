import { Request, Response } from "express";
import axios from "axios";
import Groq from "groq-sdk";
import { User } from "../models/user"; // adjust path to your actual User model
import { DeploymentSession, IDeploymentArtifact, DeploymentArtifactType } from "../models/deployment";
import { ENV } from "../config/env";

const groq = new Groq({ apiKey: ENV.GROQ_API_KEY });
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GITHUB_API = "https://api.github.com";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface GenerateRequestBody {
  repoId: string | number;
  branch?: string;
}

interface RegenerateRequestBody extends GenerateRequestBody {
  type: DeploymentArtifactType;
}

interface GithubRepoInfo {
  owner: string;
  repo: string;
  defaultBranch: string;
  htmlUrl: string;
}

interface GithubTreeEntry {
  path: string;
  type: "blob" | "tree";
  size?: number;
}

interface LLMArtifact {
  type: string;
  content: string;
}

interface LLMOutput {
  artifacts: LLMArtifact[];
}

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

// Deployment artifacts only need manifests/config, not application source, so
// the token budget here is intentionally much smaller than a full code review.
const MAX_TREE_ENTRIES = Number(process.env.DEPLOY_MAX_TREE_ENTRIES) || 200;
const MAX_SIGNAL_FILES = Number(process.env.DEPLOY_MAX_SIGNAL_FILES) || 14;
const MAX_FILE_CHARS = Number(process.env.DEPLOY_MAX_FILE_CHARS) || 3000;
const MAX_TOTAL_CONTEXT_CHARS = Number(process.env.DEPLOY_MAX_TOTAL_CONTEXT_CHARS) || 14000;

const GROQ_TEMPERATURE = 0.2;
const GROQ_SEED = 42;
const GROQ_COMPLETION_TOKENS = Number(process.env.GROQ_DEPLOY_COMPLETION_TOKENS) || 4000;
const GROQ_MAX_RETRIES = 2;

const ARTIFACT_ORDER: DeploymentArtifactType[] = ["dockerfile", "nginx", "github-actions", "kubernetes"];

const ARTIFACT_META: Record<
  DeploymentArtifactType,
  { name: string; language: string }
> = {
  dockerfile: { name: "Dockerfile", language: "dockerfile" },
  nginx: { name: "nginx.conf", language: "nginx" },
  "github-actions": { name: "deploy.yml", language: "yaml" },
  kubernetes: { name: "deployment.yaml", language: "yaml" },
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

// Manifest/config files worth reading in full — these tell us the stack,
// package manager, existing infra config, and CI setup without needing to
// read application source at all.
const SIGNAL_FILE_MATCHERS: RegExp[] = [
  /(^|\/)package\.json$/,
  /(^|\/)requirements\.txt$/,
  /(^|\/)pyproject\.toml$/,
  /(^|\/)Pipfile$/,
  /(^|\/)go\.mod$/,
  /(^|\/)Gemfile$/,
  /(^|\/)composer\.json$/,
  /(^|\/)pom\.xml$/,
  /(^|\/)build\.gradle(\.kts)?$/,
  /(^|\/)Dockerfile$/i,
  /(^|\/)docker-compose\.ya?ml$/i,
  /(^|\/)nginx\.conf$/i,
  /(^|\/)tsconfig\.json$/,
  /(^|\/)next\.config\.(js|ts|mjs)$/,
  /(^|\/)vite\.config\.(js|ts)$/,
  /(^|\/)\.nvmrc$/,
  /(^|\/)Procfile$/,
  /^\.github\/workflows\/.*\.ya?ml$/i,
  /(^|\/)k8s\/.*\.ya?ml$/i,
  /(^|\/)kubernetes\/.*\.ya?ml$/i,
];

const SYSTEM_INSTRUCTION = `You are Aether Deployment AI, a senior DevOps / Platform Engineer.

You will be given:
1. A directory listing of a GitHub repository.
2. The full contents of the repository's key manifest and config files (package.json, requirements.txt, existing Dockerfile/nginx.conf/CI workflows/k8s manifests if present, etc).

Your job is to generate exactly four production-ready deployment artifacts tailored precisely to the ACTUAL detected tech stack — never assume a generic Node.js app if the evidence points elsewhere (Python, Go, a static frontend build, a monorepo, etc). If the repository is a frontend-only app, the Dockerfile and nginx config must reflect a static build-and-serve pattern (e.g. multi-stage build then serve via nginx), not a Node server pattern.

Rules that apply to all four artifacts:
- Base every technical choice on evidence in the provided context (package manager from lockfile/engines field, language version from manifest, existing port/config already declared in the repo, existing CI workflows to extend rather than duplicate). Never invent a framework, port, or dependency that isn't evidenced.
- If something is genuinely ambiguous (e.g. no engines field), make the single most conservative, widely-correct choice and note the assumption as a comment INSIDE that artifact's file content — never outside the JSON.
- Never use pseudo-code, TODOs, or placeholder ellipses. Every file must be complete and immediately usable.
- Never include secrets or hardcoded credentials; use environment variables / CI secrets syntax appropriate to the artifact.

1. "dockerfile":
   - Multi-stage build when it reduces final image size (e.g. build deps vs runtime).
   - Correct base image and version matching the detected language/runtime.
   - Run as a non-root user.
   - Order COPY/RUN steps for effective layer caching (dependency manifests before source).
   - EXPOSE the correct port for the detected framework/existing config.

2. "nginx":
   - Reverse proxy to the app's actual port (or static file serving + caching headers if this is a static/frontend build).
   - Include gzip compression and basic security headers (X-Frame-Options, X-Content-Type-Options, etc).

3. "github-actions":
   - A complete workflow (valid YAML) triggered on push to main: install deps with the correct package manager, run tests if a test script exists, build a Docker image, and push it (use a clearly-labeled placeholder registry/image name via a secret or workflow variable, do not invent a specific real registry account).
   - If the repo already has a workflow in .github/workflows, adapt/extend its approach rather than contradicting it.

4. "kubernetes":
   - A valid multi-document YAML with a Deployment and a Service (Deployment first, then Service, separated by "---").
   - Explicit resource requests/limits, readiness and liveness probes, and a sane default replica count (2-3) for a production service.
   - Reference the image built by the CI workflow above (placeholder tag is fine).

You must output STRICT JSON and nothing else, matching exactly this schema, with all four artifacts present in this exact order:
{
  "artifacts": [
    { "type": "dockerfile", "content": "string" },
    { "type": "nginx", "content": "string" },
    { "type": "github-actions", "content": "string" },
    { "type": "kubernetes", "content": "string" }
  ]
}

Never output markdown fences. Never output explanations or commentary outside the JSON object. Every string must be valid JSON (escape newlines as \\n, quotes as \\", etc). Return only valid JSON.`;

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
    return {
      owner: data.owner?.login,
      repo: data.name,
      defaultBranch: data.default_branch,
      htmlUrl: data.html_url,
    };
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
    return decoded.length > MAX_FILE_CHARS
      ? decoded.slice(0, MAX_FILE_CHARS) + "\n# ...truncated..."
      : decoded;
  } catch (err) {
    console.warn(`[deployment] failed to fetch ${path}:`, (err as Error).message);
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

/**
 * Builds a compact, token-cheap context: a capped directory listing (paths
 * only — free signal about monorepo layout, frontend/backend split, etc)
 * plus the full contents of whatever manifest/config files actually exist.
 */
async function buildDeploymentContext(
  owner: string,
  repo: string,
  branch: string,
  token: string
): Promise<{ contextText: string; signalFilesFound: string[] }> {
  const tree = await fetchRepoTree(owner, repo, branch, token);

  const visiblePaths = tree
    .filter((e) => e.type === "blob" && !isIgnoredPath(e.path))
    .map((e) => e.path);

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

  const contextText = [
    `Directory listing (${visiblePaths.length} files total):`,
    treeListing + treeNote,
    "",
    "Key manifest/config file contents:",
    fileSections.length > 0 ? fileSections.join("\n\n") : "(none of the expected manifest/config files were found)",
  ].join("\n");

  return { contextText, signalFilesFound: signalPaths };
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
  if (!value || !Array.isArray(value.artifacts)) return false;
  const returnedTypes = value.artifacts.map((a: any) => a?.type);
  return expectedTypes.every((t) => returnedTypes.includes(t)) &&
    value.artifacts.every((a: any) => a && typeof a.type === "string" && typeof a.content === "string" && a.content.trim().length > 0);
}

// -----------------------------------------------------------------------------
// Helpers: Groq rate-limit detection (same pattern as the other Aether AI controllers)
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
  const total = Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
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

async function callGroqForArtifacts(
  contextText: string,
  owner: string,
  repo: string,
  branch: string,
  requestedTypes: DeploymentArtifactType[]
): Promise<LLMArtifact[]> {
  if (!ENV.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured on the server");
  }

  const baseUserPrompt = `Repository: ${owner}/${repo}\nBranch: ${branch}\nGenerate artifacts for these types, in this exact order: ${requestedTypes.join(
    ", "
  )}.\n\n${contextText}`;

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
                ? baseUserPrompt
                : `${baseUserPrompt}\n\nYour previous response was not valid JSON matching the required schema (all ${requestedTypes.length} artifact type(s) with non-empty content, in order). Return ONLY the raw JSON object this time.`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content || "";
      const parsed = safeParseJson(raw);

      if (isValidLLMOutput(parsed, requestedTypes)) {
        return parsed.artifacts;
      }

      lastError = new Error("Groq returned a response that did not match the expected schema");
    } catch (err) {
      const rateLimitInfo = inspectGroqError(err);
      if (rateLimitInfo.isRateLimited) {
        throw Object.assign(new Error(rateLimitInfo.message), { groqRateLimit: rateLimitInfo });
      }
      lastError = err;
      console.warn(`[deployment] Groq call attempt ${attempt} failed:`, (err as Error).message);
    }
  }

  throw lastError || new Error("Groq returned an empty or invalid response");
}

// -----------------------------------------------------------------------------
// Mapping
// -----------------------------------------------------------------------------

function normalizeArtifactType(type: string): DeploymentArtifactType | null {
  const lower = (type || "").toLowerCase().trim() as DeploymentArtifactType;
  return (ARTIFACT_ORDER as string[]).includes(lower) ? lower : null;
}

function buildArtifact(type: DeploymentArtifactType, content: string, index: number): IDeploymentArtifact {
  const meta = ARTIFACT_META[type];
  return {
    id: `${type}-${Date.now()}-${index}`,
    name: meta.name,
    type,
    content,
    language: meta.language,
  };
}

function serializeSession(doc: InstanceType<typeof DeploymentSession>) {
  return {
    id: doc._id.toString(),
    repoId: doc.repoId,
    owner: doc.owner,
    repoName: doc.repoName,
    branch: doc.branch,
    connectedRepo: doc.connectedRepo,
    artifacts: doc.artifacts,
    model: doc.model,
    status: doc.status,
    updatedAt: doc.updatedAt,
    createdAt: doc.createdAt,
  };
}

// -----------------------------------------------------------------------------
// Controllers
// -----------------------------------------------------------------------------

/**
 * POST /api/deployment/generate
 * body: { userId, repoId, branch? }
 * Generates all 4 artifacts fresh and upserts the session (one live doc per user+repo).
 */
export async function generateDeploymentArtifacts(req: Request, res: Response) {
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
        message: "Connect your GitHub account before generating deployment artifacts",
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
    const { contextText } = await buildDeploymentContext(owner, repo, resolvedBranch, token);

    let llmArtifacts: LLMArtifact[];
    try {
      llmArtifacts = await callGroqForArtifacts(contextText, owner, repo, resolvedBranch, ARTIFACT_ORDER);
    } catch (err: any) {
      const rateLimit: GroqRateLimitInfo | undefined = err?.groqRateLimit;
      if (rateLimit?.isRateLimited) {
        if (rateLimit.retryAfterSeconds) res.set("Retry-After", String(rateLimit.retryAfterSeconds));
        return res.status(429).json({
          success: false,
          message:
            rateLimit.scope === "day"
              ? "Daily AI generation budget has been used up for today. Try again later."
              : "Artifact generation is temporarily rate-limited. Try again in a moment.",
          scope: rateLimit.scope,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        });
      }

      await DeploymentSession.findOneAndUpdate(
        { user: userId, repoId: String(repoId) },
        {
          user: userId,
          repoId: String(repoId),
          owner,
          repoName: repo,
          branch: resolvedBranch,
          connectedRepo: `${owner}/${repo}`,
          model: GROQ_MODEL,
          status: "failed",
          errorMessage: err?.message || "AI generation failed",
        },
        { upsert: true }
      );

      return res.status(502).json({ success: false, message: err?.message || "AI generation failed" });
    }

    const artifacts = llmArtifacts
      .map((a, i) => {
        const type = normalizeArtifactType(a.type);
        return type ? buildArtifact(type, a.content, i) : null;
      })
      .filter((a): a is IDeploymentArtifact => a !== null);

    const session = await DeploymentSession.findOneAndUpdate(
      { user: userId, repoId: String(repoId) },
      {
        user: userId,
        repoId: String(repoId),
        owner,
        repoName: repo,
        branch: resolvedBranch,
        connectedRepo: `${owner}/${repo}`,
        artifacts,
        model: GROQ_MODEL,
        status: "completed",
        errorMessage: "",
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({ success: true, session: serializeSession(session) });
  } catch (err: any) {
    console.error("[deployment.generateDeploymentArtifacts]", err);
    return res.status(500).json({ success: false, message: err?.message || "Deployment generation failed" });
  }
}

/**
 * POST /api/deployment/regenerate
 * body: { userId, repoId, branch?, type }
 * Regenerates a single artifact and patches it into the stored session.
 */
export async function regenerateDeploymentArtifact(req: Request, res: Response) {
  try {
    const { userId, repoId, branch, type }: RegenerateRequestBody & { userId?: string } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!repoId || !type || !normalizeArtifactType(type)) {
      return res.status(400).json({ success: false, message: "repoId and a valid artifact type are required" });
    }

    const user = await User.findById(userId);
    if (!user?.githubAccessToken) {
      return res.status(400).json({ success: false, message: "Connect your GitHub account first" });
    }

    const token = user.githubAccessToken;
    const repoInfo = await fetchRepoById(repoId, token);
    const resolvedBranch = branch || repoInfo.defaultBranch;

    const { contextText } = await buildDeploymentContext(repoInfo.owner, repoInfo.repo, resolvedBranch, token);

    let llmArtifacts: LLMArtifact[];
    try {
      llmArtifacts = await callGroqForArtifacts(contextText, repoInfo.owner, repoInfo.repo, resolvedBranch, [type]);
    } catch (err: any) {
      const rateLimit: GroqRateLimitInfo | undefined = err?.groqRateLimit;
      if (rateLimit?.isRateLimited) {
        if (rateLimit.retryAfterSeconds) res.set("Retry-After", String(rateLimit.retryAfterSeconds));
        return res.status(429).json({
          success: false,
          message:
            rateLimit.scope === "day"
              ? "Daily AI generation budget has been used up for today. Try again later."
              : "Artifact generation is temporarily rate-limited. Try again in a moment.",
          scope: rateLimit.scope,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        });
      }
      return res.status(502).json({ success: false, message: err?.message || "AI generation failed" });
    }

    const newArtifact = buildArtifact(type, llmArtifacts[0].content, 0);

    const patched = await DeploymentSession.findOneAndUpdate(
      { user: userId, repoId: String(repoId), "artifacts.type": type },
      { $set: { "artifacts.$": newArtifact } },
      { new: true }
    );

    const session =
      patched ||
      (await DeploymentSession.findOneAndUpdate(
        { user: userId, repoId: String(repoId) },
        {
          $push: { artifacts: newArtifact },
          $setOnInsert: {
            owner: repoInfo.owner,
            repoName: repoInfo.repo,
            branch: resolvedBranch,
            connectedRepo: `${repoInfo.owner}/${repoInfo.repo}`,
            model: GROQ_MODEL,
            status: "completed",
          },
        },
        { upsert: true, new: true }
      ));

    return res.status(200).json({ success: true, artifact: newArtifact, session: serializeSession(session!) });
  } catch (err: any) {
    console.error("[deployment.regenerateDeploymentArtifact]", err);
    return res.status(500).json({ success: false, message: err?.message || "Failed to regenerate artifact" });
  }
}

/**
 * GET /api/deployment/latest?repoId=...
 * Returns the most recently generated artifact set for a user+repo, if any.
 */
export async function getLatestDeploymentSession(req: Request, res: Response) {
  try {
    const userId = (req.query.userId as string) || (req.body as any)?.userId;
    const { repoId } = req.query as { repoId?: string };

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!repoId) {
      return res.status(400).json({ success: false, message: "repoId is required" });
    }

    const session = await DeploymentSession.findOne({ user: userId, repoId: String(repoId) });

    return res.status(200).json({ success: true, session: session ? serializeSession(session) : null });
  } catch (err: any) {
    console.error("[deployment.getLatestDeploymentSession]", err);
    return res.status(500).json({ success: false, message: "Failed to fetch deployment session" });
  }
}