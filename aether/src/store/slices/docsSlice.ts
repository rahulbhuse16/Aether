import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {type DocsSession, generateDocs, regenerateDoc, fetchLatestDocsSession,type GeneratedDoc } from "../../services/documentation";


interface DocsState {
  repoId: string | null;
  branch: string | null;
  documents: GeneratedDoc[];
  isGenerating: boolean;
  isRegeneratingType: string | null;
  isLoadingSession: boolean;
  scanProgress: number;
  error: string | null;
}

const initialState: DocsState = {
  repoId: null,
  branch: null,
  isGenerating: false,
  isRegeneratingType: null,
  isLoadingSession: false,
  scanProgress: 100,
  error: null,
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
      preview: "## Authentication\n`POST /api/auth/login`\n\n## Projects\n`GET /api/projects`\n`POST /api/projects`",
    },
    {
      id: "d3",
      title: "Architecture Overview",
      type: "architecture",
      status: "ready",
      preview: "React → Next.js → Node → AI Gateway → Vector DB → Postgres → Redis → S3",
    },
  ],
};

function applySession(state: DocsState, session: DocsSession) {
  state.repoId = session.repoId;
  state.branch = session.branch;
  state.documents = session.documents;
}

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
    setSelectedRepo(state, action: PayloadAction<{ repoId: string; branch?: string }>) {
      state.repoId = action.payload.repoId;
      state.branch = action.payload.branch || null;
    },
    addDocument(state, action: PayloadAction<GeneratedDoc>) {
      state.documents.unshift(action.payload);
    },
    clearDocsError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ---- generateDocs ----
      .addCase(generateDocs.pending, (state) => {
        state.isGenerating = true;
        state.scanProgress = 0;
        state.error = null;
      })
      .addCase(generateDocs.fulfilled, (state, action: PayloadAction<DocsSession>) => {
        state.isGenerating = false;
        state.scanProgress = 100;
        applySession(state, action.payload);
      })
      .addCase(generateDocs.rejected, (state, action) => {
        state.isGenerating = false;
        state.scanProgress = 100;
        state.error = action.payload || "Failed to generate documentation";
      })

      // ---- regenerateDoc ----
      .addCase(regenerateDoc.pending, (state, action) => {
        state.isRegeneratingType = action.meta.arg.type;
        state.error = null;
      })
      .addCase(regenerateDoc.fulfilled, (state, action: PayloadAction<GeneratedDoc>) => {
        state.isRegeneratingType = null;
        const idx = state.documents.findIndex((d) => d.type === action.payload.type);
        if (idx >= 0) {
          state.documents[idx] = action.payload;
        } else {
          state.documents.push(action.payload);
        }
      })
      .addCase(regenerateDoc.rejected, (state, action) => {
        state.isRegeneratingType = null;
        state.error = action.payload || "Failed to regenerate document";
      })

      // ---- fetchLatestDocsSession ----
      .addCase(fetchLatestDocsSession.pending, (state) => {
        state.isLoadingSession = true;
      })
      .addCase(fetchLatestDocsSession.fulfilled, (state, action: PayloadAction<DocsSession | null>) => {
        state.isLoadingSession = false;
        if (action.payload) {
          applySession(state, action.payload);
        }
      })
      .addCase(fetchLatestDocsSession.rejected, (state) => {
        state.isLoadingSession = false;
      });
  },
});

export const { setGenerating, setScanProgress, setSelectedRepo, addDocument, clearDocsError } = docsSlice.actions;
export default docsSlice.reducer;