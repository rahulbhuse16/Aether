import axios from "axios";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { API_BASE } from "../constants/constants";
export type NodeType = "frontend" | "gateway" | "service" | "database" | "cache" | "queue";

export interface ArchitectureNode {
  id: string;
  label: string;
  type: NodeType;
  description?: string;
  tech?: string;
}

// 1:1 with the backend's `architecture` response object.
export interface ArchitectureResult {
  prompt: string;
  systemTitle: string;
  summary: string;
  nodes: ArchitectureNode[];
  suggestions: string[];
}

export interface GenerateArchitecturePayload {
  prompt: string;
}

export interface GenerateArchitectureResponse {
  success: boolean;
  architecture: ArchitectureResult;
  message?: string;
}

// -----------------------------------------------------------------------------
// Axios instance
// If your app already has a shared client (e.g. "../lib/api"), delete this
// block and import that instance instead — keep the interceptor logic.
// -----------------------------------------------------------------------------

const api = axios.create({
  baseURL: API_BASE,
 
});



function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || fallback;
  }
  return fallback;
}

// -----------------------------------------------------------------------------
// Thunks
// -----------------------------------------------------------------------------

export const generateArchitecture = createAsyncThunk<
  ArchitectureResult,
  GenerateArchitecturePayload,
  { rejectValue: string }
>("architecture/generateArchitecture", async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post<GenerateArchitectureResponse>(
      "/architecture/create",
      payload
    );
    if (!data.success) {
      return rejectWithValue(data.message || "Architecture generation failed");
    }
    return data.architecture;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, "Architecture generation failed"));
  }
});

export default api;