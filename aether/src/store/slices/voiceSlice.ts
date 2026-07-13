import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { VoiceCommand } from "../types";

interface VoiceState {
  isListening: boolean;
  commands: VoiceCommand[];
  currentTranscript: string;
}

const initialState: VoiceState = {
  isListening: false,
  currentTranscript: "",
  commands: [
    {
      id: "v1",
      transcript: "Create authentication using JWT. Store token in cookies. Generate React page with Tailwind.",
      status: "complete",
      output:
        "Generated: AuthProvider.tsx, LoginPage.tsx, authSlice.ts, jwt middleware, cookie config, and 12 unit tests.",
    },
  ],
};

const voiceSlice = createSlice({
  name: "voice",
  initialState,
  reducers: {
    setListening(state, action: PayloadAction<boolean>) {
      state.isListening = action.payload;
    },
    setCurrentTranscript(state, action: PayloadAction<string>) {
      state.currentTranscript = action.payload;
    },
    addCommand(state, action: PayloadAction<VoiceCommand>) {
      state.commands.unshift(action.payload);
    },
    updateCommandStatus(
      state,
      action: PayloadAction<{ id: string; status: VoiceCommand["status"]; output?: string }>
    ) {
      const cmd = state.commands.find((c) => c.id === action.payload.id);
      if (cmd) {
        cmd.status = action.payload.status;
        if (action.payload.output) cmd.output = action.payload.output;
      }
    },
  },
});

export const { setListening, setCurrentTranscript, addCommand, updateCommandStatus } =
  voiceSlice.actions;
export default voiceSlice.reducer;
