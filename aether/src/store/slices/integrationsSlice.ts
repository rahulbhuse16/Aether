import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Integration } from "../types";

interface IntegrationsState {
  integrations: Integration[];
}

const initialState: IntegrationsState = {
  integrations: [
    { id: "i1", name: "GitHub", type: "github", connected: true, lastSync: "2 min ago" },
    { id: "i2", name: "Jira", type: "jira", connected: true, lastSync: "15 min ago" },
    { id: "i3", name: "Slack", type: "slack", connected: false },
    { id: "i4", name: "Google Calendar", type: "google", connected: true, lastSync: "1h ago" },
    { id: "i5", name: "Notion", type: "notion", connected: false },
  ],
};

const integrationsSlice = createSlice({
  name: "integrations",
  initialState,
  reducers: {
    toggleIntegration(state, action: PayloadAction<string>) {
      const integration = state.integrations.find((i) => i.id === action.payload);
      if (integration) {
        integration.connected = !integration.connected;
        integration.lastSync = integration.connected ? "Just now" : undefined;
      }
    },
  },
});

export const { toggleIntegration } = integrationsSlice.actions;
export default integrationsSlice.reducer;
