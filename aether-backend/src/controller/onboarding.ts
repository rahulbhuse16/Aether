// Path: src/controllers/onboardingController.ts
//
// Backend for the Onboarding.tsx flow: list the user's real GitHub repos
// (replaces MOCK_REPOS), then "index" the one they pick — pull real signal
// from GitHub, have the model write one grounded, AI-generated summary of
// the repo, and persist a real Project document via Mongoose (no Firebase
// anywhere in this file, per requirement).
//
// Requires: npm install groq-sdk
// Env: GROQ_API_KEY
//
// Assumptions made explicit (adjust to match your actual User schema —
// the Project schema is now taken directly from what you provided):
//
// 1. Auth middleware runs before these handlers and attaches `req.user`
//    with at least `{ id: string }` (decoded from JWT/session — NOT
//    trusted client input). The GitHub access token is never taken from
//    the request body; it's read fresh from the User document, because
//    that's what the existing OAuth redirect flow
//    (`/api/v1/github/connect?state=${userId}`) already stores server-side
//    after the callback.
//
// 2. "../models/User" exists with at least: { githubAccessToken?: string }.
//    If the field name differs, only the `.select("+githubAccessToken")`
//    calls and `user.githubAccessToken` reads need to change.
//
// 3. Project schema now includes description/stack/setupComplexity
//    alongside githubRepoId, owner, name, repo, openTasks, lastActivity,
//    githubUpdatedAt (see the updated Project.ts) — the AI-generated
//    summary from indexing is persisted directly, no separate table.
//
// Response shapes:
//   GET  /api/v1/onboarding/repos
//     -> { repos: { id, name, description, private, openIssues, updatedAt }[] }
//
//   POST /api/v1/onboarding/index   body: { githubRepoId: string | number }
//     -> { id, name, repo, description, stack, setupComplexity, openTasks, lastActivity }
//        (matches projectsSlice's addProject payload — dispatch straight in)

import type { Response, Request } from "express";
import Groq from "groq-sdk";
import { User } from "../models/user";
import { Project } from "../models/project";
import { ENV } from "../config/env";

const groq = new Groq({ apiKey: ENV.GROQ_API_KEY });
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GITHUB_API = "https://api.github.com";

// Minimal shape auth middleware is expected to attach to req.user.


/* ---------------------------------------------------------------- */
/* GitHub                                                             */
/* ---------------------------------------------------------------- */

async function githubFetch(token: string, path: string) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API error on ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

interface GithubRepoListItem {
  id: number;
  name: string;
  description: string | null;
  private: boolean;
  openIssues: number;
  updatedAt: string;
}

/**
 * Real repo list for SelectRepoStep — replaces MOCK_REPOS. No AI here;
 * this is a direct field mapping straight off GitHub, same philosophy as
 * digestController's mapGithubItemsToTasks — deterministic data doesn't
 * need a model in front of it.
 */
async function fetchUserRepos(token: string): Promise<GithubRepoListItem[]> {
  const repos = await githubFetch(
    token,
    "/user/repos?sort=updated&per_page=50&affiliation=owner,collaborator"
  );

  return (repos as any[]).map((r) => ({
    id: r.id,
    name: r.full_name,
    description: r.description,
    private: Boolean(r.private),
    openIssues: r.open_issues_count ?? 0,
    updatedAt: r.updated_at,
  }));
}

interface RepoSignals {
  githubRepoId: number;
  repoFullName: string;
  githubDescription: string | null;
  languages: string[];
  topLevelFiles: string[];
  readmeExcerpt: string | null;
  openIssueCount: number;
  defaultBranch: string;
  githubUpdatedAt: string;
}

/**
 * Pulls the lightweight, cheap-to-fetch signals needed for a grounded
 * summary — repo metadata, detected languages, top-level file names, and
 * a truncated README. Deliberately NOT a full clone: file names + README
 * are enough for an honest one-paragraph summary, and keeping the input
 * small keeps the model's output honest (less surface area to embellish).
 */
async function gatherRepoSignals(token: string, repoId: string | number): Promise<RepoSignals> {
  const repo = await githubFetch(token, `/repositories/${repoId}`);
  const repoFullName = repo.full_name as string;
  const defaultBranch = repo.default_branch as string;

  const [languagesRes, treeRes, readmeRes] = await Promise.allSettled([
    githubFetch(token, `/repos/${repoFullName}/languages`),
    githubFetch(token, `/repos/${repoFullName}/git/trees/${defaultBranch}`),
    githubFetch(token, `/repos/${repoFullName}/readme`),
  ]);

  const languages =
    languagesRes.status === "fulfilled" ? Object.keys(languagesRes.value as object) : [];

  const topLevelFiles =
    treeRes.status === "fulfilled"
      ? ((treeRes.value as any).tree as any[])
          .filter((entry) => entry.type === "blob")
          .map((entry) => entry.path as string)
          .slice(0, 40)
      : [];

  let readmeExcerpt: string | null = null;
  if (readmeRes.status === "fulfilled") {
    const raw = (readmeRes.value as any).content as string | undefined;
    if (raw) {
      const decoded = Buffer.from(raw, "base64").toString("utf-8");
      readmeExcerpt = decoded.slice(0, 1500); // cap input size, not output
    }
  }

  return {
    githubRepoId: repo.id,
    repoFullName,
    githubDescription: repo.description,
    languages,
    topLevelFiles,
    readmeExcerpt,
    openIssueCount: repo.open_issues_count ?? 0,
    defaultBranch,
    githubUpdatedAt: repo.updated_at,
  };
}

/* ---------------------------------------------------------------- */
/* AI — one grounded summary, same discipline as digestController    */
/* ---------------------------------------------------------------- */

interface OnboardingBrief {
  summary: string;
  stack: string[];
  setupComplexity: "low" | "medium" | "high";
}

/**
 * System instruction for the onboarding summary agent.
 *
 * Scoped to exactly one job: read the repo signals and write a short,
 * accurate description a new user will see on their Project card the
 * moment indexing finishes. Same hard rules as the digest agent, because
 * the failure mode is identical — a model that sounds confident about a
 * repo it never actually looked at:
 * - JSON-only, exact schema, so there's nothing for the frontend to
 *   defensively parse.
 * - Forbidden from inventing frameworks/languages not present in the
 *   input — "stack" must be a subset of what languages/topLevelFiles/
 *   readmeExcerpt actually show.
 * - Explicit fallback for thin input (empty README, no recognizable
 *   files) instead of guessing a purpose for the repo.
 */
const ONBOARDING_SYSTEM_PROMPT = `You are Aether's onboarding agent. You are given signals about a single GitHub repository (its GitHub-provided description, detected languages, a partial top-level file listing, and a truncated README) as JSON, immediately after a user selects it to be indexed for the first time. Write the one-paragraph summary that will appear on their new Project card.

Respond with ONLY a single JSON object — no markdown code fences, no commentary before or after. The JSON must match exactly this shape:

{
  "summary": string,
  "stack": string[],
  "setupComplexity": "low" | "medium" | "high"
}

Field rules:
- "summary": 1-2 sentences, present tense, describing what the repository actually is and does. Base it on the README excerpt and githubDescription first; fall back to inferring from file names/languages only if those are empty. Max 220 characters. If there is genuinely not enough signal to say anything specific, use exactly "No description available yet — indexing found limited signal in this repo." rather than inventing a purpose.
- "stack": 2-6 short tags (e.g. "TypeScript", "React", "Postgres", "Docker"). Every tag must be directly supported by the "languages" list, a recognizable config/manifest file in "topLevelFiles" (e.g. package.json implies Node, requirements.txt implies Python, Dockerfile implies Docker), or an explicit mention in the README. Never include a tag you can't point to in the input. If nothing is identifiable, return an empty array.
- "setupComplexity": "low" if the repo looks like a small/single-purpose project (few top-level files, single language), "medium" for a typical multi-file app, "high" if there are signs of a multi-service/monorepo setup (multiple distinct app directories, multiple unrelated language ecosystems, docker-compose with several services). Default to "medium" if genuinely unclear.

Hard rules:
- Only reference facts present in the input. Never invent a framework, database, file, or feature that isn't shown.
- No marketing language, no exclamation points, no emoji. Write like a terse, accurate tool description, not ad copy.
- Output valid JSON only. Do not wrap it in triple backticks or add any surrounding text.`;

function isValidBrief(x: any): x is OnboardingBrief {
  return (
    typeof x?.summary === "string" &&
    x.summary.trim().length > 0 &&
    Array.isArray(x?.stack) &&
    x.stack.every((tag: unknown) => typeof tag === "string") &&
    ["low", "medium", "high"].includes(x?.setupComplexity)
  );
}

async function callOnboardingModel(signals: RepoSignals): Promise<OnboardingBrief> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        temperature: 0.2, // consistency matters more than variety here too
        response_format: { type: "json_object" },
        max_tokens: 400,
        messages: [
          { role: "system", content: ONBOARDING_SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              githubDescription: signals.githubDescription,
              languages: signals.languages,
              topLevelFiles: signals.topLevelFiles,
              readmeExcerpt: signals.readmeExcerpt,
            }),
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) throw new Error("Empty response from Groq");

      const parsed = JSON.parse(raw);
      if (!isValidBrief(parsed)) throw new Error("Onboarding brief missing required fields");

      // Trust but verify: drop any stack tag the model claimed that isn't
      // actually traceable to languages/topLevelFiles/readme, rather than
      // relying on the prompt alone to prevent it.
      const haystack = [
        ...signals.languages,
        ...signals.topLevelFiles,
        signals.readmeExcerpt ?? "",
      ]
        .join(" ")
        .toLowerCase();
      parsed.stack = parsed.stack.filter((tag: string) => haystack.includes(tag.toLowerCase()));

      return parsed;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Onboarding summary generation failed");
}

/* ---------------------------------------------------------------- */
/* Handlers                                                           */
/* ---------------------------------------------------------------- */

/**
 * GET /api/v1/onboarding/repos
 * Powers SelectRepoStep with the user's real repos instead of MOCK_REPOS.
 */
export async function listGithubRepos(req: Request, res: Response) {
  const userId = req.params?.id;
  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const user = await User.findById(userId).select("+githubAccessToken");
    if (!user?.githubAccessToken) {
      return res.status(409).json({ error: "GitHub account not connected yet" });
    }

    const repos = await fetchUserRepos(user.githubAccessToken);
    res.json({ repos });
  } catch (err) {
    console.error("listGithubRepos failed:", err);
    res.status(502).json({ error: (err as Error).message });
  }
}

/**
 * POST /api/v1/onboarding/index
 * body: { githubRepoId: string | number }
 *
 * Powers IndexingStep -> handleIndexingDone. Gathers real signal from
 * GitHub, gets one grounded AI summary, and creates/updates the Project
 * in Mongo — including the AI-generated description/stack/setupComplexity,
 * which are now real schema fields. Returns the shape addProject expects
 * so the frontend can dispatch the response directly.
 */
export async function indexRepository(req: Request, res: Response) {
  const userId = req.params?.id;
  const { githubRepoId } = req.body as { githubRepoId?: string | number };

  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (githubRepoId === undefined || githubRepoId === null || githubRepoId === "") {
    return res.status(400).json({ error: "Missing githubRepoId" });
  }

  try {
    const user = await User.findById(userId).select("+githubAccessToken");
    if (!user?.githubAccessToken) {
      return res.status(409).json({ error: "GitHub account not connected yet" });
    }

    // Respects the schema's unique (owner, githubRepoId) index — re-index
    // instead of erroring on a duplicate-key if they pick the same repo
    // again (e.g. retried onboarding after a failed first attempt).
    const existing = await Project.findOne({
      owner: userId,
      githubRepoId: Number(githubRepoId),
    });

    const signals = await gatherRepoSignals(user.githubAccessToken, githubRepoId);
    const brief = await callOnboardingModel(signals);

    const projectFields = {
      owner: userId,
      githubRepoId: signals.githubRepoId,
      name: signals.repoFullName.split("/")[1],
      repo: signals.repoFullName,
      openTasks: signals.openIssueCount,
      lastActivity: "just now",
      githubUpdatedAt: new Date(signals.githubUpdatedAt),
      description: brief.summary,
      stack: brief.stack,
      setupComplexity: brief.setupComplexity,
    };

    const project = existing
      ? await Project.findByIdAndUpdate(existing._id, projectFields, { new: true })
      : await Project.create(projectFields);

    res.json({
      id: project!._id.toString(),
      name: project!.name,
      repo: project!.repo,
      description: project!.description,
      stack: project!.stack,
      setupComplexity: project!.setupComplexity,
      openTasks: project!.openTasks,
      lastActivity: project!.lastActivity,
    });
  } catch (err) {
    console.error("indexRepository failed:", err);
    res.status(502).json({ error: (err as Error).message });
  }
}