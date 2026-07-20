import axios from "axios";
import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/api";
export type DeploymentArtifactType = "dockerfile" | "nginx" | "github-actions" | "kubernetes";

export interface DeploymentArtifact {
  id: string;
  name: string;
  type: DeploymentArtifactType;
  content: string;
  language?: string;
}

// 1:1 with the backend's serializeSession() output.
export interface DeploymentSession {
  id: string;
  repoId: string;
  owner: string;
  repoName: string;
  branch: string;
  connectedRepo: string;
  artifacts: DeploymentArtifact[];
  model: string;
  status: "completed" | "failed";
  createdAt: string;
  updatedAt: string;
}

export interface GenerateDeploymentPayload {
  repoId: string | number;
  branch?: string;
}

export interface RegenerateDeploymentArtifactPayload extends GenerateDeploymentPayload {
  type: DeploymentArtifactType;
}

export interface GenerateDeploymentResponse {
  success: boolean;
  session: DeploymentSession;
  message?: string;
}

export interface RegenerateDeploymentResponse {
  success: boolean;
  artifact: DeploymentArtifact;
  session: DeploymentSession;
  message?: string;
}

export interface GetLatestDeploymentResponse {
  success: boolean;
  session: DeploymentSession | null;
}

// -----------------------------------------------------------------------------
// Axios instance
// If your app already has a shared client (e.g. "../lib/api"), delete this
// block and import that instance instead — keep the interceptor logic.
// -----------------------------------------------------------------------------





function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || fallback;
  }
  return fallback;
}

// -----------------------------------------------------------------------------
// Thunks
// -----------------------------------------------------------------------------
const userId=localStorage.getItem("userId")
export const generateDeploymentArtifacts = createAsyncThunk<
  DeploymentSession,
  GenerateDeploymentPayload,
  { rejectValue: string }
>("deployment/generateDeploymentArtifacts", async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post<GenerateDeploymentResponse>("/deployment/generate", {...payload,
        userId
    });
    if (!data.success) {
      return rejectWithValue(data.message || "Failed to generate deployment artifacts");
    }
    return data.session;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, "Failed to generate deployment artifacts"));
  }
});

export const regenerateDeploymentArtifact = createAsyncThunk<
  DeploymentArtifact,
  RegenerateDeploymentArtifactPayload,
  { rejectValue: string }
>("deployment/regenerateDeploymentArtifact", async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post<RegenerateDeploymentResponse>("/deployment/regenerate", {...payload,
        userId
    });
    if (!data.success) {
      return rejectWithValue(data.message || "Failed to regenerate artifact");
    }
    return data.artifact;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, "Failed to regenerate artifact"));
  }
});

export const fetchLatestDeploymentSession = createAsyncThunk<
  DeploymentSession | null,
  { repoId: string | number },
  { rejectValue: string }
>("deployment/fetchLatestDeploymentSession", async ({ repoId }, { rejectWithValue }) => {
  try {
    const { data } = await api.get<GetLatestDeploymentResponse>("/deployment/latest", {
      params: { repoId ,userId},
    });
    if (!data.success) {
      return rejectWithValue("Failed to load deployment session");
    }
    return data.session;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, "Failed to load deployment session"));
  }
});

export default api;