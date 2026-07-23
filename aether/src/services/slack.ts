import { API_BASE } from "../constants/constants";
import api from "../api/api";

export interface SlackChannel {
  id: string;
  name: string;
  notificationsEnabled: boolean;
}

export interface SlackNotificationPreferences {
  prReviews: boolean;
  meetingSummaries: boolean;
  aiAlerts: boolean;
  dailyDigest: boolean;
}

export interface SlackStatus {
  connected: boolean;
  workspaceName: string | null;
  connectedAt?: string | null;
  channels: SlackChannel[];
}

const slackApi = api

export const slackService = {
  /**
   * Kicks off the OAuth flow — this is a full-page redirect, not an XHR,
   * so it doesn't return a promise the way the other calls do.
   */
  connect: (userId: string): void => {
    window.location.href = `${API_BASE}/slack/connect?userId=${userId}`;
  },

  disconnect: async (userId: string): Promise<{ success: boolean }> => {
    const { data } = await slackApi.post("/slack/disconnect", { userId });
    return data;
  },

  getStatus: async (userId: string): Promise<SlackStatus> => {
    const { data } = await slackApi.get("/slack/status", {
      params: { userId },
    });
    return data;
  },

  getChannels: async (userId: string): Promise<SlackChannel[]> => {
    const { data } = await slackApi.get("/slack/channels", {
      params: { userId },
    });
    return data.channels;
  },

  toggleChannelNotifications: async (
    userId: string,
    channelId: string,
    enabled: boolean
  ): Promise<{ success: boolean }> => {
    const { data } = await slackApi.patch(`/slack/channels/${channelId}`, {
      userId,
      notificationsEnabled: enabled,
    });
    return data;
  },

  updateNotificationPreferences: async (
    userId: string,
    preferences: Partial<SlackNotificationPreferences>
  ): Promise<SlackNotificationPreferences> => {
    const { data } = await slackApi.patch("/slack/preferences", {
      userId,
      ...preferences,
    });
    return data;
  },
};