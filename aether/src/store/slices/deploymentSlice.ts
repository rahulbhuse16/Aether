import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  generateDeploymentArtifacts,
  regenerateDeploymentArtifact,
  fetchLatestDeploymentSession,
  type DeploymentArtifact,
  type DeploymentSession,
}
 from "../../services/deployment";

interface DeploymentState {
  repoId: string | null;
  branch: string | null;
  artifacts: DeploymentArtifact[];
  connectedRepo: string | null;
  isGenerating: boolean;
  isRegeneratingType: string | null;
  isLoadingSession: boolean;
  error: string | null;
}

const initialState: DeploymentState = {
  repoId: null,
  branch: null,
  connectedRepo: "aether/core",
  isGenerating: false,
  isRegeneratingType: null,
  isLoadingSession: false,
  error: null,
  artifacts: [
    {
      id: "a1",
      name: "Dockerfile",
      type: "dockerfile",
      content: `FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --production\nCOPY . .\nEXPOSE 3000\nCMD ["node", "dist/index.js"]`,
      language: "dockerfile",
    },
    {
      id: "a2",
      name: "nginx.conf",
      type: "nginx",
      content: `server {\n  listen 80;\n  location / {\n    proxy_pass http://app:3000;\n  }\n}`,
      language: "nginx",
    },
    {
      id: "a3",
      name: "deploy.yml",
      type: "github-actions",
      content: `name: Deploy\non:\n  push:\n    branches: [main]\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: docker build -t aether .`,
      language: "yaml",
    },
    {
      id: "a4",
      name: "deployment.yaml",
      type: "kubernetes",
      content: `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: aether-api\nspec:\n  replicas: 3`,
      language: "yaml",
    },
  ],
};

function applySession(state: DeploymentState, session: DeploymentSession) {
  state.repoId = session.repoId;
  state.branch = session.branch;
  state.connectedRepo = session.connectedRepo;
  state.artifacts = session.artifacts;
}

const deploymentSlice = createSlice({
  name: "deployment",
  initialState,
  reducers: {
    setGenerating(state, action: PayloadAction<boolean>) {
      state.isGenerating = action.payload;
    },
    setConnectedRepo(state, action: PayloadAction<string | null>) {
      state.connectedRepo = action.payload;
    },
    setSelectedRepo(state, action: PayloadAction<{ repoId: string; branch?: string }>) {
      state.repoId = action.payload.repoId;
      state.branch = action.payload.branch || null;
    },
    addArtifact(state, action: PayloadAction<DeploymentArtifact>) {
      state.artifacts.push(action.payload);
    },
    clearDeploymentError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ---- generateDeploymentArtifacts ----
      .addCase(generateDeploymentArtifacts.pending, (state) => {
        state.isGenerating = true;
        state.error = null;
      })
      .addCase(
        generateDeploymentArtifacts.fulfilled,
        (state, action: PayloadAction<DeploymentSession>) => {
          state.isGenerating = false;
          applySession(state, action.payload);
        }
      )
      .addCase(generateDeploymentArtifacts.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.payload || "Failed to generate deployment artifacts";
      })

      // ---- regenerateDeploymentArtifact ----
      .addCase(regenerateDeploymentArtifact.pending, (state, action) => {
        state.isRegeneratingType = action.meta.arg.type;
        state.error = null;
      })
      .addCase(
        regenerateDeploymentArtifact.fulfilled,
        (state, action: PayloadAction<DeploymentArtifact>) => {
          state.isRegeneratingType = null;
          const idx = state.artifacts.findIndex((a) => a.type === action.payload.type);
          if (idx >= 0) {
            state.artifacts[idx] = action.payload;
          } else {
            state.artifacts.push(action.payload);
          }
        }
      )
      .addCase(regenerateDeploymentArtifact.rejected, (state, action) => {
        state.isRegeneratingType = null;
        state.error = action.payload || "Failed to regenerate artifact";
      })

      // ---- fetchLatestDeploymentSession ----
      .addCase(fetchLatestDeploymentSession.pending, (state) => {
        state.isLoadingSession = true;
      })
      .addCase(
        fetchLatestDeploymentSession.fulfilled,
        (state, action: PayloadAction<DeploymentSession | null>) => {
          state.isLoadingSession = false;
          if (action.payload) {
            applySession(state, action.payload);
          }
        }
      )
      .addCase(fetchLatestDeploymentSession.rejected, (state) => {
        state.isLoadingSession = false;
      });
  },
});

export const { setGenerating, setConnectedRepo, setSelectedRepo, addArtifact, clearDeploymentError } =
  deploymentSlice.actions;
export default deploymentSlice.reducer;