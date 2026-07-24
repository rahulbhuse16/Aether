import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Integration } from "../types";

interface IntegrationsState {
  integrations: Integration[];
}

type IntegrationType =
  | "github"
  | "jira"
  | "slack"
  | "google"
  | "notion";

interface IntegrationStatus {
  connected: boolean;
  lastSync?: string;
}

type IntegrationStatusPayload = Record<
  IntegrationType,
  IntegrationStatus
>;

const initialState: IntegrationsState = {
  integrations: [
    {
      id: "i1",
      name: "GitHub",
      type: "github",
      connected: false,
    },
    {
      id: "i2",
      name: "Jira",
      type: "jira",
      connected: false,
    },
    {
      id: "i3",
      name: "Slack",
      type: "slack",
      connected: false,
    },
    {
      id: "i4",
      name: "Google Calendar",
      type: "google",
      connected: false,
    },
    {
      id: "i5",
      name: "Notion",
      type: "notion",
      connected: false,
    },
  ],
};

const integrationsSlice = createSlice({
  name: "integrations",
  initialState,

  reducers: {
    toggleIntegration(
      state,
      action: PayloadAction<string>
    ) {
      const integration = state.integrations.find(
        (i) => i.id === action.payload
      );

      if (integration) {
        integration.connected = !integration.connected;

        integration.lastSync = integration.connected
          ? "Just now"
          : undefined;
      }
    },

    setIntegrationState(
      state,
      action: PayloadAction<IntegrationStatusPayload>
    ) {
      state.integrations = state.integrations.map(
        (integration) => {
          const status =
            action.payload[integration.type];

          return {
            ...integration,

            connected: status.connected,

            lastSync: status.connected
              ? status.lastSync ?? "Just now"
              : undefined,
          };
        }
      );
    },
  },
});

export const {
  toggleIntegration,
  setIntegrationState,
} = integrationsSlice.actions;

export default integrationsSlice.reducer;