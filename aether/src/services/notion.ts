import { API_BASE } from "../constants/constants";
import api from "../api/api";

export type NotionPageType =
  | "meeting_notes"
  | "adr"
  | "documentation"
  | "general";

export interface NotionPage {
  id: string;
  notionPageId: string;
  title: string;
  url: string;
  icon: string | null;
  pageType: NotionPageType;
  lastEditedTime: string;
  archived: boolean;
}

export interface ActionItem {
  title: string;
  description: string;
  assignee: string | null;
  priority: "low" | "medium" | "high" | null;
  dueDate: string | null;
}

export interface NotionStatus {
  connected: boolean;
  workspaceId: string | null;
  workspaceName: string | null;
  lastSyncAt: string | null;
}

const notionApi = api;

const getUserId = (): string => {
  return localStorage.getItem("userId") || "";
};

export const notionService = {
  connect: (): void => {
    const userId = getUserId();

    window.location.href = `${API_BASE}/notion/connect?userId=${encodeURIComponent(
      userId
    )}`;
  },

  disconnect: async (): Promise<{ success: boolean }> => {
    const { data } = await notionApi.delete("/notion/disconnect", {
      params: {
        userId: getUserId(),
      },
    });

    return data;
  },

  getStatus: async (): Promise<NotionStatus> => {
    const { data } = await notionApi.get("/notion/status", {
      params: {
        userId: getUserId(),
      },
    });

    return data;
  },

  sync: async (): Promise<{
    success: boolean;
    syncedCount: number;
  }> => {
    const { data } = await notionApi.post(
      "/notion/sync",
      {},
      {
        params: {
          userId: getUserId(),
        },
      }
    );

    return data;
  },

  getPages: async (
    page = 1,
    limit = 25
  ): Promise<{ pages: NotionPage[]; total: number }> => {
    const { data } = await notionApi.get("/notion/pages", {
      params: {
        userId: getUserId(),
        page,
        limit,
      },
    });

    return data;
  },

  search: async (q: string): Promise<NotionPage[]> => {
    const { data } = await notionApi.get("/notion/search", {
      params: {
        userId: getUserId(),
        q,
      },
    });

    return data;
  },

  createPage: async (
    title: string,
    content?: string,
    parentPageId?: string
  ): Promise<NotionPage> => {
    const { data } = await notionApi.post(
      "/notion/pages",
      {
        title,
        content,
        parentPageId,
      },
      {
        params: {
          userId: getUserId(),
        },
      }
    );

    return data;
  },

  analyzeMeetingNotes: async (
    notionPageId: string
  ): Promise<{
    pageTitle: string;
    pageUrl: string;
    items: ActionItem[];
  }> => {
    const { data } = await notionApi.post(
      `/notion/pages/${notionPageId}/meeting-notes/analyze`,
      {},
      {
        params: {
          userId: getUserId(),
        },
      }
    );

    return data;
  },

  confirmActionItems: async (
    sourcePageId: string,
    sourcePageTitle: string,
    items: ActionItem[]
  ): Promise<{
    success: boolean;
    tasks: unknown[];
  }> => {
    const { data } = await notionApi.post(
      "/notion/meeting-notes/confirm",
      {
        sourcePageId,
        sourcePageTitle,
        items,
      },
      {
        params: {
          userId: getUserId(),
        },
      }
    );

    return data;
  },
};