import axios from "axios";
import type { ReviewFinding } from "../store/types";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { API_BASE } from "../constants/constants";


export interface ReviewResponse {
  findings: ReviewFinding[];
}

export async function fetchCodeReview(payload: {
  projectId: string;
  prNumber: number;
}): Promise<ReviewResponse> {
  const userId = localStorage.getItem("userId") || "";
  const res = await axios.post(`${API_BASE}/code-review/review`, {
    projectId: payload.projectId,
    prNumber: payload.prNumber,
    userId,
  });

  return res.data as ReviewResponse;
}


export async function fetchPullRequest(
  projectId: string
  
) {
  const userId = localStorage.getItem("userId") || "";
  const res = await axios.get(`${API_BASE}/github/pulls?repoId=${projectId}&userId=${userId}`);

  return res.data.pullRequests;
}



export const setPullRequestByFetching = createAsyncThunk(
  "reviews/setPullRequestByFetching",
  async (
  projectId: string,
    thunkAPI
  ) => {
    try {
      const response = await fetchPullRequest(projectId);
      return { pullRequests: response };
    } catch (err: any) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.error || err.message || "Failed to fetch PR"
      );
    }
  }
);

export const analyzePullRequest = createAsyncThunk(
  "reviews/analyze",
  async (
    payload: { projectId: string; prNumber: number; prId: string },
    thunkAPI
  ) => {
    try {
      const response = await fetchCodeReview({
        projectId: payload.projectId,
        prNumber: payload.prNumber,
      });
      return { prId: payload.prId, findings: response.findings };
    } catch (err: any) {
      return thunkAPI.rejectWithValue(
        err.response?.data?.error || err.message || "Failed to analyze PR"
      );
    }
  }
);