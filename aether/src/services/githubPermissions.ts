import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/api";

interface GitHubPermissions {
  repoAccess: string[];
  webhookEnabled: boolean;
  commitAnalysisEnabled: boolean;
  prAnalysisEnabled: boolean;
  lastSync?: string;
}

interface UpdatePermissionsParams {
  userId: string;
  repoAccess?: string[];
  webhookEnabled?: boolean;
  commitAnalysisEnabled?: boolean;
  prAnalysisEnabled?: boolean;
}

interface SyncRepositoriesParams {
  userId: string;
}

interface PermissionsResponse {
  success: boolean;
  data: GitHubPermissions;
}

interface SyncResponse {
  success: boolean;
  data: GitHubPermissions;
  message: string;
}

/**
 * Fetch GitHub permissions
 */
export const fetchGitHubPermissions = createAsyncThunk<
  PermissionsResponse,
  { userId: string },
  { rejectValue: string }
>(
  "githubPermissions/fetchPermissions",
  async ({ userId }, thunkAPI) => {
    try {
      const response = await api.get<PermissionsResponse>(
        `/github-permissions/${userId}`
      );
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ?? "Failed to fetch GitHub permissions"
      );
    }
  }
);

/**
 * Update GitHub permissions
 */
export const updateGitHubPermissions = createAsyncThunk<
  PermissionsResponse,
  UpdatePermissionsParams,
  { rejectValue: string }
>(
  "githubPermissions/updatePermissions",
  async (params, thunkAPI) => {
    try {
      const response = await api.patch<PermissionsResponse>(
        `/github-permissions/${params.userId}`,
        params
      );
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ?? "Failed to update permissions"
      );
    }
  }
);

/**
 * Sync repositories
 */
export const syncRepositories = createAsyncThunk<
  SyncResponse,
  SyncRepositoriesParams,
  { rejectValue: string }
>(
  "githubPermissions/syncRepositories",
  async ({ userId }, thunkAPI) => {
    try {
      const response = await api.post<SyncResponse>(
        `/github-permissions/${userId}/sync`
      );
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ?? "Failed to sync repositories"
      );
    }
  }
);
