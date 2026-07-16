import axios from "axios";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { API_BASE } from "../constants/constants";
export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface BugFinding {
  id?: string;
  title: string;
  severity: Severity;
  confidence: number;
  category: string;
  file: string;
  lineStart: number;
  lineEnd: number;
  description: string;
  rootCause: string;
  impact: string;
  fix: string;
  codeSnippet: string;
  relatedFiles: string[];
}

// 1:1 with the backend's serializeReport() output — no remapping needed.
export interface BugAnalysisReport {
  id: string;
  repoUrl: string;
  repoName: string;
  owner: string;
  branch: string;
  focusPath?: string;
  stackTraceContext?: string;
  repositoryHealthScore: number;
  summary: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  findings: BugFinding[];
  filesAnalyzed: number;
  filesSkipped: number;
  model: string;
  status: "completed" | "failed";
  createdAt: string;
  updatedAt: string;
}

export interface AnalyzeRepoPayload {
  repoId: string;
  branch?: string;
  focusPath?: string;
  stackTrace?: string;
}

export interface AnalyzeRepoResponse {
  success: boolean;
  report: BugAnalysisReport;
  message?: string;
}

export interface GetReportsResponse {
  success: boolean;
  reports: BugAnalysisReport[];
}

export interface GetReportResponse {
  success: boolean;
  report: BugAnalysisReport;
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
const userId = localStorage.getItem("userId")
export const analyzeRepository = createAsyncThunk<
  AnalyzeRepoResponse["report"],
  AnalyzeRepoPayload,
  { rejectValue: string }
>("bugs/analyzeRepository", async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post<AnalyzeRepoResponse>(
      "/bug-finder/analyze",
      {...payload,
        userId
      }
    );
    if (!data.success) {
      return rejectWithValue(data.message || "Analysis failed");
    }
    return data.report;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, "Repository analysis failed"));
  }
});

export const fetchBugReports = createAsyncThunk<
  GetReportsResponse["reports"],
  void,
  { rejectValue: string }
>("bugs/fetchBugReports", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get<GetReportsResponse>(`/bug-finder/reports-list/${userId}`);
    return data.reports;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, "Failed to load reports"));
  }
});

export const fetchBugReportById = createAsyncThunk<
  GetReportResponse["report"],
  string,
  { rejectValue: string }
>("bugs/fetchBugReportById", async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.get<GetReportResponse>(`/bug-finder/reports/${id}?userId=${userId}`);
    return data.report;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, "Failed to load report"));
  }
});

export const deleteBugReport = createAsyncThunk<string, string, { rejectValue: string }>(
  "bugs/deleteBugReport",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/bug-finder/reports/${id}?userId=${userId}`);
      return id;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error, "Failed to delete report"));
    }
  }
);

export default api;