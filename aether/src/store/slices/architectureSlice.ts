import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ArchitectureNode } from "../types";

interface ArchitectureState {
  prompt: string;
  nodes: ArchitectureNode[];
  isGenerating: boolean;
}

const UBER_NODES: ArchitectureNode[] = [
  { id: "n1", label: "React Frontend", type: "frontend" },
  { id: "n2", label: "API Gateway", type: "gateway" },
  { id: "n3", label: "Auth Service", type: "service" },
  { id: "n4", label: "Driver Service", type: "service" },
  { id: "n5", label: "Ride Service", type: "service" },
  { id: "n6", label: "Payment Service", type: "service" },
  { id: "n7", label: "Notification Service", type: "service" },
  { id: "n8", label: "Redis", type: "cache" },
  { id: "n9", label: "Kafka", type: "queue" },
  { id: "n10", label: "Postgres", type: "database" },
];

const initialState: ArchitectureState = {
  prompt: "Build Uber Clone",
  nodes: UBER_NODES,
  isGenerating: false,
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
  },
});

export const { setPrompt, setNodes, setGenerating } = architectureSlice.actions;
export default architectureSlice.reducer;
