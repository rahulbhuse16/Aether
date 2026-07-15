// Path: src/services/onboarding.ts
//
// Talks to onboardingController.ts on the backend. Two calls, matching
// the two real steps in Onboarding.tsx: list the connected account's
// repos, then kick off indexing for the one the user picked.
//
// Auth: cookie/session based, same as the rest of the app (the GitHub
// OAuth callback already establishes the session server-side — nothing
// extra to attach here beyond credentials: "include"). If this project
// instead sends a bearer token from local storage, add an Authorization
// header here to match — that's the one assumption this file makes.

import axios from "axios";

const API_BASE = "https://aether-api-y0ob.onrender.com/api/v1";

export interface GithubRepoListItem {
  id: number;
  name: string;
  description: string | null;
  private: boolean;
  openIssues: number;
  updatedAt: string;
}

export interface IndexedProject {
  id: string;
  name: string;
  repo: string;
  description?: string;
  stack?: string[];
  setupComplexity?: "low" | "medium" | "high";
  openTasks: number;
  lastActivity: string;
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return typeof body?.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

const userId=localStorage.getItem("userId") as string

export async function fetchGithubRepos(): Promise<GithubRepoListItem[]> {
  const res = await axios.get(`${API_BASE}/github/repos/${userId}`);

  if (!res.data) {
    throw new Error(await readErrorMessage(res.data, "Couldn't load your repositories."));
  }

  const data = await res.data;
  return data.repos as GithubRepoListItem[];
}

export async function indexGithubRepo(githubRepoId: number): Promise<IndexedProject> {
  const res = await axios.post(`${API_BASE}/github/index/${userId}`, {githubRepoId});

  if (!res.data) {
    throw new Error(await readErrorMessage(res.data, "Couldn't index that repository."));
  }

  return (await res.data) as IndexedProject;
}