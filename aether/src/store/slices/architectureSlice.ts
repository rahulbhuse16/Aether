import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { generateArchitecture, type ArchitectureNode, type ArchitectureResult } from "../../services/architecture";


interface ArchitectureState {
  prompt: string;
  nodes: ArchitectureNode[];
  systemTitle: string;
  summary: string;
  suggestions: string[];
  isGenerating: boolean;
  error: string | null;
}

const UBER_NODES: ArchitectureNode[] = [
  
];

const DEFAULT_SUGGESTIONS = [
  "E-commerce Platform",
  "SaaS Dashboard",
  "Real-time Chat App",
  "Video Streaming Service",
  "Food Delivery Platform",
  "Social Media Feed",
  "Fleet Tracking System",
];

const initialState: ArchitectureState = {
  prompt: "Build Uber Clone",
  nodes: UBER_NODES,
  systemTitle: "Ride-Hailing Platform Architecture",
  summary: "",
  suggestions: DEFAULT_SUGGESTIONS,
  isGenerating: false,
  error: null,
};

const architectureSlice = createSlice({
  name: "architecture",
  initialState,
  reducers: {
    setPrompt(state, action: PayloadAction<string>) {
      state.prompt = action.payload;
    },
    setNodes(state, action: PayloadAction<ArchitectureNode[]>) {
      state.nodes = action.payload;
    },
    setGenerating(state, action: PayloadAction<boolean>) {
      state.isGenerating = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateArchitecture.pending, (state) => {
        state.isGenerating = true;
        state.error = null;
      })
      .addCase(
        generateArchitecture.fulfilled,
        (state, action: PayloadAction<ArchitectureResult>) => {
          state.isGenerating = false;
          state.nodes = action.payload.nodes;
          state.systemTitle = action.payload.systemTitle;
          state.summary = action.payload.summary;
          // Only replace the suggestion chips if the AI actually returned some —
          // otherwise keep whatever was showing (defaults or the last good set).
          if (action.payload.suggestions.length > 0) {
            state.suggestions = action.payload.suggestions;
          }
        }
      )
      .addCase(generateArchitecture.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.payload || "Architecture generation failed";
      });
  },
});

export const { setPrompt, setNodes, setGenerating, clearError } = architectureSlice.actions;
export default architectureSlice.reducer;