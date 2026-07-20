import axios from "axios";
import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/api";

export interface VoiceCommand {
  id: string;
  transcript: string;
  status: "pending" | "building" | "complete";
  output?: string;
  generatedFiles?: string[];
}

export interface GenerateVoiceCommandPayload {
  transcript: string;
  userId?: string;
}

export interface GenerateVoiceCommandResponse {
  success: boolean;
  command: VoiceCommand;
  message?: string;
}

export interface VoiceHistoryResponse {
  success: boolean;
  commands: VoiceCommand[];
  message?: string;
}

// -----------------------------------------------------------------------------
// Axios instance
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

export const generateVoiceCommand = createAsyncThunk<
  VoiceCommand,
  GenerateVoiceCommandPayload,
  { rejectValue: string }
>("voice/generateVoiceCommand", async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post<GenerateVoiceCommandResponse>(
      "/voice-engineer/generate",
      {...payload,userId}
    );
    if (!data.success) {
      return rejectWithValue(data.message || "Voice command generation failed");
    }
    return data.command;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, "Voice command generation failed"));
  }
});

export const getVoiceHistory = createAsyncThunk<
  VoiceCommand[],
  { userId?: string },
  { rejectValue: string }
>("voice/getVoiceHistory", async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.get<VoiceHistoryResponse>("/voice-engineer/history", {
      params: {userId},
    });
    if (!data.success) {
      return rejectWithValue(data.message || "Failed to fetch voice history");
    }
    return data.commands;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, "Failed to fetch voice history"));
  }
});

export default api;
