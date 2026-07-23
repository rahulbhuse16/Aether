import { createSlice, createAsyncThunk, type PayloadAction, nanoid } from "@reduxjs/toolkit";
import { slackService, type ChatMessage } from "../../services/slack-chat";

interface ChatState {
  activeChannelId: string | null;
  messagesByChannel: Record<string, ChatMessage[]>;
  status: "idle" | "loading" | "succeeded" | "failed";
  sendingStatus: "idle" | "sending" | "failed";
  error: string | null;
}

/**
 * Placeholder threads so the Chat page renders something real before
 * /slack/channels/:id/messages is live. Channel ids line up with the dummy
 * channels seeded in slackSlice.ts (C01/C02/C03).
 */
const initialState: ChatState = {
  activeChannelId: "",
  messagesByChannel: {
    C01: [
      {
        id: "m1",
        channelId: "C01",
        userName: "Priya Shah",
        text: "Deploy for the calendar fix is queued up.",
        timestamp: "2026-07-22T09:12:00.000Z",
        source: "slack",
      },
      {
        id: "m2",
        channelId: "C01",
        userName: "You",
        text: "Nice, ping me once it's live.",
        timestamp: "2026-07-22T09:14:00.000Z",
        source: "app",
      },
    ],
    C02: [
      {
        id: "m3",
        channelId: "C02",
        userName: "Aether Bot",
        text: "Heap usage back to normal after the webhook fix.",
        timestamp: "2026-07-22T10:00:00.000Z",
        source: "slack",
      },
    ],
    C03: [],
  },
  status: "idle",
  sendingStatus: "idle",
  error: null,
};

export const fetchChannelMessages = createAsyncThunk(
  "chat/fetchChannelMessages",
  async (args: { userId: string; channelId: string }) => {
    const messages = await slackService.getChannelMessages(
      args.userId,
      args.channelId
    );
    console.log("messages", messages);
    return { channelId: args.channelId, messages };
  }
);

export const sendChatMessage = createAsyncThunk(
  "chat/sendChatMessage",
  async (args: { userId: string; channelId: string; text: string }) => {
    const message = await slackService.sendChannelMessage(
      args.userId,
      args.channelId,
      args.text
    );
    return { channelId: args.channelId, message, tempId: args.text };
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveChannel: (state, action: PayloadAction<string>) => {
      state.activeChannelId = action.payload;
      if (!state.messagesByChannel[action.payload]) {
        state.messagesByChannel[action.payload] = [];
      }
    },
    // Show the message immediately while sendChatMessage is in flight.
    addOptimisticMessage: (
      state,
      action: PayloadAction<{ channelId: string; text: string; userName: string }>
    ) => {
      const { channelId, text, userName } = action.payload;
      if (!state.messagesByChannel[channelId]) {
        state.messagesByChannel[channelId] = [];
      }
      state.messagesByChannel[channelId].push({
        id: `optimistic-${nanoid()}`,
        channelId,
        userName,
        text,
        timestamp: new Date().toISOString(),
        source: "app",
      });
    },
    // Called by the polling loop / a future websocket push with new
    // messages that arrived from the Slack side.
    receiveIncomingMessages: (
      state,
      action: PayloadAction<{ channelId: string; messages: ChatMessage[] }>
    ) => {
      const { channelId, messages } = action.payload;
      const existing = state.messagesByChannel[channelId] || [];
      const existingIds = new Set(existing.map((m) => m.id));
      const merged = [
        ...existing,
        ...messages.filter((m) => !existingIds.has(m.id)),
      ];
      state.messagesByChannel[channelId] = merged;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChannelMessages.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchChannelMessages.fulfilled, (state, action) => {
        state.status = "succeeded";
        const { channelId, messages } = action.payload;
        if (messages.length) {
          state.messagesByChannel[channelId] = messages;
        }
      })
      .addCase(fetchChannelMessages.rejected, (state, action) => {
        // Keep whatever's already on screen (dummy or previously fetched).
        state.status = "failed";
        state.error = action.error.message ?? "Failed to load messages";
      })
      .addCase(sendChatMessage.pending, (state) => {
        state.sendingStatus = "sending";
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.sendingStatus = "idle";
        const { channelId, message } = action.payload;
        const thread = state.messagesByChannel[channelId] || [];
        // Drop the optimistic placeholder for this text, replace with the
        // confirmed message from the server.
        const withoutOptimistic = thread.filter(
          (m) => !(m.id.startsWith("optimistic-") && m.text === message.text)
        );
        state.messagesByChannel[channelId] = [...withoutOptimistic, message];
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.sendingStatus = "failed";
        state.error = action.error.message ?? "Failed to send message";
      });
  },
});

export const { setActiveChannel, addOptimisticMessage, receiveIncomingMessages } =
  chatSlice.actions;
export default chatSlice.reducer;