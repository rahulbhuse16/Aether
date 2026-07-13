import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { DeploymentArtifact } from "../types";

interface DeploymentState {
  artifacts: DeploymentArtifact[];
  isGenerating: boolean;
  connectedRepo: string | null;
}

const initialState: DeploymentState = {
  connectedRepo: "aether/core",
  isGenerating: false,
  artifacts: [
    {
      id: "a1",
      name: "Dockerfile",
      type: "dockerfile",
      content: `FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --production\nCOPY . .\nEXPOSE 3000\nCMD ["node", "dist/index.js"]`,
    },
    {
      id: "a2",
      name: "nginx.conf",
      type: "nginx",
      content: `server {\n  listen 80;\n  location / {\n    proxy_pass http://app:3000;\n  }\n}`,
    },
    {
      id: "a3",
      name: "deploy.yml",
      type: "github-actions",
      content: `name: Deploy\non:\n  push:\n    branches: [main]\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: docker build -t aether .`,
    },
    {
      id: "a4",
      name: "deployment.yaml",
      type: "kubernetes",
      content: `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: aether-api\nspec:\n  replicas: 3`,
    },
  ],
};

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
    addArtifact(state, action: PayloadAction<DeploymentArtifact>) {
      state.artifacts.push(action.payload);
    },
  },
});

export const { setGenerating, setConnectedRepo, addArtifact } = deploymentSlice.actions;
export default deploymentSlice.reducer;
