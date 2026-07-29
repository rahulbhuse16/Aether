import { createSlice } from "@reduxjs/toolkit";
import {
  fetchGitHubPermissions,
  updateGitHubPermissions,
  syncRepositories,
} from "../../services/githubPermissions";

interface GitHubPermissionsState {
  repoAccess: string[];
  webhookEnabled: boolean;
  commitAnalysisEnabled: boolean;
  prAnalysisEnabled: boolean;
  lastSync?: string;
  loading: boolean;
  error: string | null;
}

const initialState: GitHubPermissionsState = {
  repoAccess: [],
  webhookEnabled: false,
  commitAnalysisEnabled: false,
  prAnalysisEnabled: false,
  lastSync: undefined,
  loading: false,
  error: null,
};

const githubPermissionsSlice = createSlice({
  name: "githubPermissions",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch permissions
      .addCase(fetchGitHubPermissions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGitHubPermissions.fulfilled, (state, action) => {
        state.loading = false;
        state.repoAccess = action.payload.data.repoAccess;
        state.webhookEnabled = action.payload.data.webhookEnabled;
        state.commitAnalysisEnabled = action.payload.data.commitAnalysisEnabled;
        state.prAnalysisEnabled = action.payload.data.prAnalysisEnabled;
        state.lastSync = action.payload.data.lastSync;
      })
      .addCase(fetchGitHubPermissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch GitHub permissions";
      })
      // Update permissions
      .addCase(updateGitHubPermissions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateGitHubPermissions.fulfilled, (state, action) => {
        state.loading = false;
        state.repoAccess = action.payload.data.repoAccess;
        state.webhookEnabled = action.payload.data.webhookEnabled;
        state.commitAnalysisEnabled = action.payload.data.commitAnalysisEnabled;
        state.prAnalysisEnabled = action.payload.data.prAnalysisEnabled;
      })
      .addCase(updateGitHubPermissions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update permissions";
      })
      // Sync repositories
      .addCase(syncRepositories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(syncRepositories.fulfilled, (state, action) => {
        state.loading = false;
        state.repoAccess = action.payload.data.repoAccess;
        state.lastSync = new Date().toISOString();
      })
      .addCase(syncRepositories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to sync repositories";
      });
  },
});

export const { clearError } = githubPermissionsSlice.actions;
export default githubPermissionsSlice.reducer;
