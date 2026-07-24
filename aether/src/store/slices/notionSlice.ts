import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { notionService, type NotionPage } from "../../services/notion";

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

const notionSlice = createSlice({
  name: "notion",
  initialState,
  reducers: {},
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
      });
  },
});

export default notionSlice.reducer;