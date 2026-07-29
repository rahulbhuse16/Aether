
import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/api";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type ApiKeyPurpose =
  | "cli"
  | "github_actions"
  | "ci_cd"
  | "custom";

export interface ApiKey {
  id: string;
  name: string;
  purpose: ApiKeyPurpose[];
  createdAt: string;
  lastUsed?: string;
  key?: string;

  tokensUsed: number;
  tokenLimit: number;

  spendingUsed: number;
  spendingLimit: number;

  rateLimit: number;
}

export interface SecuritySession {
  id: string;
  device: string;
  browser: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  apiKeys: ApiKey[];
  sessions: SecuritySession[];
}

/* -------------------------------------------------------------------------- */
/* REQUEST PARAMS                                                             */
/* -------------------------------------------------------------------------- */

export interface UpdateSecuritySettingsParams {
  userId: string;
  twoFactorEnabled: boolean;
}

export interface CreateApiKeyParams {
  userId: string;
  name: string;
  purpose: ApiKeyPurpose[];

  tokenLimit: number;
  spendingLimit: number;
  rateLimit: number;
}

export interface DeleteApiKeyParams {
  userId: string;
  apiKeyId: string;
}

export interface RevokeSessionParams {
  userId: string;
  sessionId: string;
}

/* -------------------------------------------------------------------------- */
/* RESPONSES                                                                  */
/* -------------------------------------------------------------------------- */

export interface SecurityResponse {
  success: boolean;
  data: SecuritySettings;
  message?: string;
}

export interface CreateApiKeyResponse {
  success: boolean;
  data: {
    apiKey: ApiKey;
  };
  message?: string;
}

/* -------------------------------------------------------------------------- */
/* FETCH SECURITY SETTINGS                                                    */
/* -------------------------------------------------------------------------- */

export const fetchSecuritySettings = createAsyncThunk<
  SecurityResponse,
  { userId: string },
  { rejectValue: string }
>(
  "security/fetchSecuritySettings",
  async ({ userId }, thunkAPI) => {
    try {
      const response = await api.get<SecurityResponse>(
        `/security/${userId}`
      );

      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ??
          "Failed to fetch security settings"
      );
    }
  }
);

/* -------------------------------------------------------------------------- */
/* UPDATE TWO-FACTOR AUTHENTICATION                                           */
/* -------------------------------------------------------------------------- */

export const updateTwoFactorAuth = createAsyncThunk<
  SecurityResponse,
  UpdateSecuritySettingsParams,
  { rejectValue: string }
>(
  "security/updateTwoFactorAuth",
  async (
    { userId, twoFactorEnabled },
    thunkAPI
  ) => {
    try {
      const response = await api.patch<SecurityResponse>(
        `/security/${userId}/2fa`,
        {
          twoFactorEnabled,
        }
      );

      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ??
          "Failed to update 2FA settings"
      );
    }
  }
);

/* -------------------------------------------------------------------------- */
/* CREATE API KEY                                                             */
/* -------------------------------------------------------------------------- */

export const createApiKey = createAsyncThunk<
  CreateApiKeyResponse,
  CreateApiKeyParams,
  { rejectValue: string }
>(
  "security/createApiKey",
  async (
    {
      userId,
      name,
      purpose,
      tokenLimit,
      spendingLimit,
      rateLimit,
    },
    thunkAPI
  ) => {
    try {
      const response = await api.post<CreateApiKeyResponse>(
        `/security/${userId}/api-keys`,
        {
          name,
          purpose,
          tokenLimit,
          spendingLimit,
          rateLimit,
        }
      );

      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ??
          "Failed to create API key"
      );
    }
  }
);

/* -------------------------------------------------------------------------- */
/* DELETE API KEY                                                             */
/* -------------------------------------------------------------------------- */

export const deleteApiKey = createAsyncThunk<
  SecurityResponse,
  DeleteApiKeyParams,
  { rejectValue: string }
>(
  "security/deleteApiKey",
  async (
    { userId, apiKeyId },
    thunkAPI
  ) => {
    try {
      const response = await api.delete<SecurityResponse>(
        `/security/${userId}/api-keys/${apiKeyId}`
      );

      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ??
          "Failed to delete API key"
      );
    }
  }
);

/* -------------------------------------------------------------------------- */
/* REVOKE SESSION                                                             */
/* -------------------------------------------------------------------------- */

export const revokeSession = createAsyncThunk<
  SecurityResponse,
  RevokeSessionParams,
  { rejectValue: string }
>(
  "security/revokeSession",
  async (
    { userId, sessionId },
    thunkAPI
  ) => {
    try {
      const response = await api.delete<SecurityResponse>(
        `/security/${userId}/sessions/${sessionId}`
      );

      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ??
          "Failed to revoke session"
      );
    }
  }
);

