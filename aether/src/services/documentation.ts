import axios from "axios";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { API_BASE } from "../constants/constants";
import api from "../api/api";
export type GeneratedDocType = "readme" | "api" | "architecture" | "flow";

export interface GeneratedDoc {
  id: string;
  title: string;
  type: GeneratedDocType;
  status: "ready" | "generating" | "error";
  preview: string;
  content?: string;
}

// 1:1 with the backend's serializeSession() output.
export interface DocsSession {
  id: string;
  repoId: string;
  owner: string;
  repoName: string;
  branch: string;
  documents: GeneratedDoc[];
  model: string;
  status: "completed" | "failed";
  createdAt: string;
  updatedAt: string;
}

export interface GenerateDocsPayload {
  repoId: string | number;
  branch?: string;
}

export interface RegenerateDocPayload extends GenerateDocsPayload {
  type: GeneratedDocType;
}

export interface GenerateDocsResponse {
  success: boolean;
  session: DocsSession;
  message?: string;
}

export interface RegenerateDocResponse {
  success: boolean;
  document: GeneratedDoc;
  session: DocsSession;
  message?: string;
}

export interface GetLatestDocsResponse {
  success: boolean;
  session: DocsSession | null;
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

const userId=localStorage.getItem("userId")

// -----------------------------------------------------------------------------
// Thunks
// -----------------------------------------------------------------------------

export const generateDocs = createAsyncThunk<DocsSession, GenerateDocsPayload, { rejectValue: string }>(
  "docs/generateDocs",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post<GenerateDocsResponse>("/docs/generate", {userId, ...payload});
      console.log();
      if (!data.success) {
        return rejectWithValue(data.message || "Failed to generate documentation");
      }
      return data.session;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, "Failed to generate documentation"));
    }
  }
);

export const regenerateDoc = createAsyncThunk<GeneratedDoc, RegenerateDocPayload, { rejectValue: string }>(
  "docs/regenerateDoc",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post<RegenerateDocResponse>("/docs/regenerate", {userId, ...payload});
      console.log();
      if (!data.success) {
        return rejectWithValue(data.message || "Failed to regenerate document");
      }
      return data.document;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, "Failed to regenerate document"));
    }
  }
);

export const fetchLatestDocsSession = createAsyncThunk<
  DocsSession | null,
  { repoId: string | number },
  { rejectValue: string }
>("docs/fetchLatestDocsSession", async ({ repoId }, { rejectWithValue }) => {
  try {
    const { data } = await api.get<GetLatestDocsResponse>("/docs/latest", { params: { repoId, userId} });
    if (!data.success) {
      return rejectWithValue("Failed to load documentation session");
    }
    return data.session;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, "Failed to load documentation session"));
  }
});

export default api;