import { createSlice } from "@reduxjs/toolkit";
import {
  fetchSecuritySettings,
  updateTwoFactorAuth,
  createApiKey,
  deleteApiKey,
  revokeSession,
} from "../../services/security";

interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  lastUsed?: string;
}

interface Session {
  id: string;
  device: string;
  browser: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

interface SecurityState {
  twoFactorEnabled: boolean;
  apiKeys: ApiKey[];
  sessions: Session[];
  loading: boolean;
  error: string | null;
}

const initialState: SecurityState = {
  twoFactorEnabled: false,
  apiKeys: [],
  sessions: [],
  loading: false,
  error: null,
};

const securitySlice = createSlice({
  name: "security",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch security settings
      .addCase(fetchSecuritySettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSecuritySettings.fulfilled, (state, action) => {
        state.loading = false;
        state.twoFactorEnabled = action.payload.data.twoFactorEnabled;
        state.apiKeys = action.payload.data.apiKeys;
        state.sessions = action.payload.data.sessions;
      })
      .addCase(fetchSecuritySettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch security settings";
      })
      // Update 2FA
      .addCase(updateTwoFactorAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTwoFactorAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.twoFactorEnabled = action.payload.data.twoFactorEnabled;
      })
      .addCase(updateTwoFactorAuth.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update 2FA settings";
      })
      // Create API key
      .addCase(createApiKey.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createApiKey.fulfilled, (state, action) => {
        state.loading = false;
        state.apiKeys = action.payload.data.apiKeys;
      })
      .addCase(createApiKey.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to create API key";
      })
      // Delete API key
      .addCase(deleteApiKey.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteApiKey.fulfilled, (state, action) => {
        state.loading = false;
        state.apiKeys = action.payload.data.apiKeys;
      })
      .addCase(deleteApiKey.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to delete API key";
      })
      // Revoke session
      .addCase(revokeSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(revokeSession.fulfilled, (state, action) => {
        state.loading = false;
        state.sessions = action.payload.data.sessions;
      })
      .addCase(revokeSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to revoke session";
      });
  },
});

export const { clearError } = securitySlice.actions;
export default securitySlice.reducer;
