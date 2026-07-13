import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { GeneratedDoc } from "../types";

interface DocsState {
  documents: GeneratedDoc[];
  isGenerating: boolean;
  scanProgress: number;
}

const initialState: DocsState = {
  documents: [
    {
      id: "d1",
      title: "README.md",
      type: "readme",
      status: "ready",
      preview:
        "# Aether Core\n\nAI-powered engineering operating system for software teams.\n\n## Quick Start\n```bash\nnpm install && npm run dev\n```",
    },
    {
      id: "d2",
      title: "API Reference",
      type: "api",
      status: "ready",
      preview:
        "## Authentication\n`POST /api/auth/login`\n\n## Projects\n`GET /api/projects`\n`POST /api/projects`",
    },
    {
      id: "d3",
      title: "Architecture Overview",
      type: "architecture",
      status: "ready",
      preview:
        "React → Next.js → Node → AI Gateway → Vector DB → Postgres → Redis → S3",
    },
  ],
  isGenerating: false,
  scanProgress: 100,
};

const docsSlice = createSlice({
  name: "docs",
  initialState,
  reducers: {
    setGenerating(state, action: PayloadAction<boolean>) {
      state.isGenerating = action.payload;
    },
    setScanProgress(state, action: PayloadAction<number>) {
      state.scanProgress = action.payload;
    },
    addDocument(state, action: PayloadAction<GeneratedDoc>) {
      state.documents.unshift(action.payload);
    },
  },
});

export const { setGenerating, setScanProgress, addDocument } = docsSlice.actions;
export default docsSlice.reducer;
