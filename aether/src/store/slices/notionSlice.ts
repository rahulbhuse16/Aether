import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { notionService,type NotionPage, type ActionItem } from "../../services/notion";

interface NotionState {
  connected: boolean;
  workspaceId: string | null;
  workspaceName: string | null;
  lastSyncAt: string | null;
  pages: NotionPage[];
  total: number;
  loading: boolean;
  syncing: boolean;
  error: string | null;

  // Meeting notes → action items
  meetingNotes: {
    sourcePageId: string | null;
    sourcePageTitle: string | null;
    sourcePageUrl: string | null;
    items: ActionItem[];
    analyzing: boolean;
    confirming: boolean;
    confirmedCount: number | null;
    error: string | null;
  };
}

const initialState: NotionState = {
  connected: false,
  workspaceId: null,
  workspaceName: null,
  lastSyncAt: null,
  pages: [],
  total: 0,
  loading: false,
  syncing: false,
  error: null,

  meetingNotes: {
    sourcePageId: null,
    sourcePageTitle: null,
    sourcePageUrl: null,
    items: [],
    analyzing: false,
    confirming: false,
    confirmedCount: null,
    error: null,
  },
};

export const getNotionStatus = createAsyncThunk("notion/getStatus", async () => {
  return await notionService.getStatus();
});

export const syncNotion = createAsyncThunk("notion/sync", async () => {
  const result = await notionService.sync();
  const pagesRes = await notionService.getPages(1, 25);
  return { result, pagesRes };
});

export const getNotionPages = createAsyncThunk(
  "notion/getPages",
  async (args: { page?: number; limit?: number } = {}) => {
    return await notionService.getPages(args.page, args.limit);
  }
);

export const searchNotion = createAsyncThunk("notion/search", async (q: string) => {
  return await notionService.search(q);
});

export const createNotionPage = createAsyncThunk(
  "notion/createPage",
  async (args: { title: string; content?: string; parentPageId?: string }) => {
    return await notionService.createPage(args.title, args.content, args.parentPageId);
  }
);

export const disconnectNotion = createAsyncThunk("notion/disconnect", async () => {
  await notionService.disconnect();
});

export const analyzeMeetingNotes = createAsyncThunk(
  "notion/analyzeMeetingNotes",
  async (notionPageId: string) => {
    const result = await notionService.analyzeMeetingNotes(notionPageId);
    return { notionPageId, ...result };
  }
);

export const confirmMeetingActionItems = createAsyncThunk(
  "notion/confirmMeetingActionItems",
  async (args: { sourcePageId: string; sourcePageTitle: string; items: ActionItem[] }) => {
    return await notionService.confirmActionItems(
      args.sourcePageId,
      args.sourcePageTitle,
      args.items
    );
  }
);

const notionSlice = createSlice({
  name: "notion",
  initialState,
  reducers: {
    // Local edits before confirming — the extraction is a starting point,
    // not the final word; the user can rewrite/deselect items freely.
    updateMeetingActionItem: (
      state,
      action: { payload: { index: number; item: ActionItem } }
    ) => {
      state.meetingNotes.items[action.payload.index] = action.payload.item;
    },
    removeMeetingActionItem: (state, action: { payload: number }) => {
      state.meetingNotes.items.splice(action.payload, 1);
    },
    clearMeetingNotesState: (state) => {
      state.meetingNotes = initialState.meetingNotes;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getNotionStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getNotionStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.connected = action.payload.connected;
        state.workspaceId = action.payload.workspaceId;
        state.workspaceName = action.payload.workspaceName;
        state.lastSyncAt = action.payload.lastSyncAt;
      })
      .addCase(getNotionStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to load Notion status";
      })

      .addCase(syncNotion.pending, (state) => {
        state.syncing = true;
        state.error = null;
      })
      .addCase(syncNotion.fulfilled, (state, action) => {
        state.syncing = false;
        state.lastSyncAt = new Date().toISOString();
        state.pages = action.payload.pagesRes.pages;
        state.total = action.payload.pagesRes.total;
      })
      .addCase(syncNotion.rejected, (state, action) => {
        state.syncing = false;
        state.error = action.error.message ?? "Failed to sync Notion";
      })

      .addCase(getNotionPages.pending, (state) => {
        state.loading = true;
      })
      .addCase(getNotionPages.fulfilled, (state, action) => {
        state.loading = false;
        state.pages = action.payload.pages;
        state.total = action.payload.total;
      })
      .addCase(getNotionPages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to load Notion pages";
      })

      .addCase(searchNotion.fulfilled, (state, action) => {
        state.pages = action.payload;
      })

      .addCase(createNotionPage.fulfilled, (state, action) => {
        state.pages = [action.payload, ...state.pages];
        state.total += 1;
      })

      .addCase(disconnectNotion.fulfilled, (state) => {
        state.connected = false;
        state.workspaceId = null;
        state.workspaceName = null;
        state.pages = [];
        state.total = 0;
      })

      .addCase(analyzeMeetingNotes.pending, (state) => {
        state.meetingNotes.analyzing = true;
        state.meetingNotes.error = null;
        state.meetingNotes.confirmedCount = null;
      })
      .addCase(analyzeMeetingNotes.fulfilled, (state, action) => {
        state.meetingNotes.analyzing = false;
        state.meetingNotes.sourcePageId = action.payload.notionPageId;
        state.meetingNotes.sourcePageTitle = action.payload.pageTitle;
        state.meetingNotes.sourcePageUrl = action.payload.pageUrl;
        state.meetingNotes.items = action.payload.items;
      })
      .addCase(analyzeMeetingNotes.rejected, (state, action) => {
        state.meetingNotes.analyzing = false;
        state.meetingNotes.error =
          action.error.message ?? "Failed to analyze meeting notes";
      })

      .addCase(confirmMeetingActionItems.pending, (state) => {
        state.meetingNotes.confirming = true;
        state.meetingNotes.error = null;
      })
      .addCase(confirmMeetingActionItems.fulfilled, (state, action) => {
        state.meetingNotes.confirming = false;
        state.meetingNotes.confirmedCount = action.payload.tasks.length;
        state.meetingNotes.items = [];
      })
      .addCase(confirmMeetingActionItems.rejected, (state, action) => {
        state.meetingNotes.confirming = false;
        state.meetingNotes.error =
          action.error.message ?? "Failed to create tasks from action items";
      });
  },
});

export const { updateMeetingActionItem, removeMeetingActionItem, clearMeetingNotesState } =
  notionSlice.actions;
export default notionSlice.reducer;