import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ChatMessage } from "../types";

interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;
  input: string;
}

const initialState: ChatState = {
  messages: [
    {
      id: "m1",
      role: "assistant",
      content:
        "I've indexed your repository. Ask me anything about the codebase — architecture, auth flow, migrations, or where specific logic lives.",
      timestamp: "09:00",
    },
  ],
  isTyping: false,
  input: "",
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setInput(state, action: PayloadAction<string>) {
      state.input = action.payload;
    },
    addMessage(state, action: PayloadAction<ChatMessage>) {
      state.messages.push(action.payload);
    },
    setTyping(state, action: PayloadAction<boolean>) {
      state.isTyping = action.payload;
    },
    clearChat(state) {
      state.messages = initialState.messages;
      state.input = "";
    },
  },
});

export const { setInput, addMessage, setTyping, clearChat } = chatSlice.actions;
export default chatSlice.reducer;
