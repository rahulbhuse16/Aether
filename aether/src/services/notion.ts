import { API_BASE } from "../constants/constants";
import api from "../api/api";

export interface NotionPage {
  id: string;
  notionPageId: string;
  title: string;
  url: string;
  icon: string | null;
  lastEditedTime: string;
  archived: boolean;
}

export interface NotionStatus {
  connected: boolean;
  workspaceId: string | null;
  workspaceName: string | null;
  lastSyncAt: string | null;
}

/**
 * withCredentials + no userId in any call — the backend resolves the
 * user from the authenticated session, per "do not trust arbitrary
 * userId values from the frontend."
 */
const notionApi = api

const userId=localStorage.getItem('userId') as string

export const notionService = {
  connect: (): void => {
    window.location.href = `${API_BASE}/notion/connect?userId=${userId}`;
  },

  disconnect: async (): Promise<{ success: boolean }> => {
    const { data } = await notionApi.delete(`/notion/disconnect?userId=${userId}`);
    return data;
  },

  getStatus: async (): Promise<NotionStatus> => {
    const { data } = await notionApi.get(`/notion/status?userId=${userId}`);
    return data;
  },

  sync: async (): Promise<{ success: boolean; syncedCount: number }> => {
    const { data } = await notionApi.post(`/notion/sync?userId=${userId}`);
    return data;
  },

  getPages: async (
    page = 1,
    limit = 25
  ): Promise<{ pages: NotionPage[]; total: number }> => {
    const { data } = await notionApi.get(`/notion/pages?userId=${userId}`, { params: { page, limit } });
    return data;
  },

  search: async (q: string): Promise<NotionPage[]> => {
    const { data } = await notionApi.get(`/notion/search?userId=${userId}`, { params: { q } });
    return data;
  },

  createPage: async (
    title: string,
    content?: string,
    parentPageId?: string
  ): Promise<NotionPage> => {
    const { data } = await notionApi.post(`/notion/pages?userId=${userId}`, {
      title,
      content,
      parentPageId,
    });
    return data;
  },
};