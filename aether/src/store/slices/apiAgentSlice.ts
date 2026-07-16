import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ApiArtifact } from "../types";

interface ApiAgentState {
  swaggerUrl: string;
  specTitle: string | null;
  artifacts: ApiArtifact[];
  isGenerating: boolean;
  error: string | null;
}

const initialState: ApiAgentState = {
  swaggerUrl: "https://petstore3.swagger.io/api/v3/openapi.json",
  specTitle: null,
  isGenerating: false,
  error: null,
  artifacts: [],
};

const apiAgentSlice = createSlice({
  name: "apiAgent",
  initialState,
  reducers: {
    setSwaggerUrl(state, action: PayloadAction<string>) {
      state.swaggerUrl = action.payload;
    },
    setGenerating(state, action: PayloadAction<boolean>) {
      state.isGenerating = action.payload;
      if (action.payload) state.error = null;
    },
    setArtifacts(state, action: PayloadAction<{ artifacts: ApiArtifact[]; specTitle?: string | null }>) {
      state.artifacts = action.payload.artifacts;
      state.specTitle = action.payload.specTitle ?? state.specTitle;
      state.isGenerating = false;
      state.error = null;
    },
    upsertArtifact(state, action: PayloadAction<ApiArtifact>) {
      const idx = state.artifacts.findIndex((a) => a.type === action.payload.type);
      if (idx >= 0) state.artifacts[idx] = action.payload;
      else state.artifacts.push(action.payload);
    },
    setArtifactStatus(state, action: PayloadAction<{ type: ApiArtifact["type"]; status: ApiArtifact["status"] }>) {
      const artifact = state.artifacts.find((a) => a.type === action.payload.type);
      if (artifact) artifact.status = action.payload.status;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isGenerating = false;
    },
    addArtifact(state, action: PayloadAction<ApiArtifact>) {
      state.artifacts.push(action.payload);
    },
  },
});

export const {
  setSwaggerUrl,
  setGenerating,
  setArtifacts,
  upsertArtifact,
  setArtifactStatus,
  setError,
  addArtifact,
} = apiAgentSlice.actions;
export default apiAgentSlice.reducer;