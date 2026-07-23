import { createSlice, createAsyncThunk,type  PayloadAction } from "@reduxjs/toolkit";
import {
  slackService,
 type SlackChannel,
 type SlackNotificationPreferences,
} from "../../services/slack";

interface SlackState {
  connected: boolean;
  workspaceName: string | null;
  connectedAt: string | null;
  channels: SlackChannel[];
  preferences: SlackNotificationPreferences;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

/**
 * Placeholder data so the Slack page has something real-looking to render
 * before /slack/status is live on the backend. Once fetchSlackStatus
 * succeeds it overwrites all of this — if it fails, this dummy data stays
 * on screen instead of showing an empty state.
 */
const initialState: SlackState = {
  connected: true,
  workspaceName: "Aether Workspace",
  connectedAt: "2026-06-14T10:00:00.000Z",
  channels: [
    { id: "C01", name: "general", notificationsEnabled: true },
    { id: "C02", name: "eng-alerts", notificationsEnabled: true },
    { id: "C03", name: "pr-reviews", notificationsEnabled: false },
  ],
  preferences: {
    prReviews: true,
    meetingSummaries: true,
    aiAlerts: false,
    dailyDigest: false,
  },
  status: "idle",
  error: null,
};

export const fetchSlackStatus = createAsyncThunk(
  "slack/fetchStatus",
  async (userId: string) => {
    return await slackService.getStatus(userId);
  }
);

export const fetchSlackChannels = createAsyncThunk(
  "slack/fetchChannels",
  async (userId: string) => {
    return await slackService.getChannels(userId);
  }
);

export const disconnectSlack = createAsyncThunk(
  "slack/disconnect",
  async (userId: string) => {
    await slackService.disconnect(userId);
    return userId;
  }
);

export const toggleChannelNotifications = createAsyncThunk(
  "slack/toggleChannelNotifications",
  async (args: { userId: string; channelId: string; enabled: boolean }) => {
    await slackService.toggleChannelNotifications(
      args.userId,
      args.channelId,
      args.enabled
    );
    return args;
  }
);

export const updateSlackPreferences = createAsyncThunk(
  "slack/updatePreferences",
  async (args: {
    userId: string;
    preferences: Partial<SlackNotificationPreferences>;
  }) => {
    await slackService.updateNotificationPreferences(
      args.userId,
      args.preferences
    );
    return args.preferences;
  }
);

const slackSlice = createSlice({
  name: "slack",
  initialState,
  reducers: {
    // Optimistic local update so toggles feel instant; the thunk fires the
    // real request in parallel and reconciles on success/failure.
    setChannelNotification: (
      state,
      action: PayloadAction<{ channelId: string; enabled: boolean }>
    ) => {
      const channel = state.channels.find(
        (c) => c.id === action.payload.channelId
      );
      if (channel) channel.notificationsEnabled = action.payload.enabled;
    },
    setPreference: (
      state,
      action: PayloadAction<{
        key: keyof SlackNotificationPreferences;
        value: boolean;
      }>
    ) => {
      state.preferences[action.payload.key] = action.payload.value;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSlackStatus.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchSlackStatus.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.connected = action.payload.connected;
        state.workspaceName = action.payload.workspaceName;
        state.connectedAt = action.payload.connectedAt ?? null;
        if (action.payload.channels?.length) {
          state.channels = action.payload.channels;
        }
      })
      .addCase(fetchSlackStatus.rejected, (state, action) => {
        // Keep the dummy/previous data visible; only surface the error.
        state.status = "failed";
        state.error = action.error.message ?? "Failed to load Slack status";
      })
      .addCase(fetchSlackChannels.fulfilled, (state, action) => {
        state.channels = action.payload;
      })
      .addCase(disconnectSlack.fulfilled, (state) => {
        state.connected = false;
        state.workspaceName = null;
        state.connectedAt = null;
        state.channels = [];
      })
      .addCase(toggleChannelNotifications.fulfilled, (state, action) => {
        const channel = state.channels.find(
          (c) => c.id === action.payload.channelId
        );
        if (channel) channel.notificationsEnabled = action.payload.enabled;
      })
      .addCase(updateSlackPreferences.fulfilled, (state, action) => {
        state.preferences = { ...state.preferences, ...action.payload };
      });
  },
});

export const { setChannelNotification, setPreference } = slackSlice.actions;
export default slackSlice.reducer;