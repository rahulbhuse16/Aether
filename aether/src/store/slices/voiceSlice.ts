import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { VoiceCommand } from "../types";
import { generateVoiceCommand, getVoiceHistory } from "../../services/voice";

interface VoiceState {
  isListening: boolean;
  commands: VoiceCommand[];
  currentTranscript: string;
  isGenerating: boolean;
  error: string | null;
}

const initialState: VoiceState = {
  isListening: false,
  currentTranscript: "",
  commands: [
    {
      id: "v1",
      transcript: "Create authentication using JWT. Store token in cookies. Generate React page with Tailwind.",
      status: "complete",
      
  output: "Generated complete JWT authentication with React frontend, Express backend, MongoDB models, middleware, validation and tests.",
  generatedFiles: [
    {
      "path": "frontend/src/pages/Login.tsx",
      "language": "typescript",
      "content": "import React, { useState } from 'react';\nimport { login } from '../services/authService';\n\nexport default function Login() {\n  const [email, setEmail] = useState('');\n  const [password, setPassword] = useState('');\n\n  const handleSubmit = async (e: React.FormEvent) => {\n    e.preventDefault();\n    await login(email, password);\n  };\n\n  return (\n    <form onSubmit={handleSubmit}>\n      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder=\"Email\" />\n      <input type=\"password\" value={password} onChange={(e) => setPassword(e.target.value)} placeholder=\"Password\" />\n      <button type=\"submit\">Login</button>\n    </form>\n  );\n}"
    },
    {
      "path": "backend/src/controllers/auth.controller.ts",
      "language": "typescript",
      "content": "import { Request, Response } from 'express';\nimport * as authService from '../services/auth.service';\n\nexport const login = async (req: Request, res: Response) => {\n  const token = await authService.login(req.body);\n  res.json({ token });\n};"
    },
    {
      "path": "backend/src/services/auth.service.ts",
      "language": "typescript",
      "content": "import jwt from 'jsonwebtoken';\n\nexport async function login(credentials: any) {\n  return jwt.sign({ id: '123' }, process.env.JWT_SECRET!, { expiresIn: '7d' });\n}"
    },
    {
      "path": "backend/src/models/User.ts",
      "language": "typescript",
      "content": "import mongoose from 'mongoose';\n\nconst UserSchema = new mongoose.Schema({\n  email: String,\n  password: String\n});\n\nexport default mongoose.model('User', UserSchema);"
    },
    {
      "path": "backend/src/middleware/auth.middleware.ts",
      "language": "typescript",
      "content": "import { Request, Response, NextFunction } from 'express';\nimport jwt from 'jsonwebtoken';\n\nexport function authenticate(req: Request, res: Response, next: NextFunction) {\n  const token = req.headers.authorization?.split(' ')[1];\n  if (!token) return res.status(401).json({ message: 'Unauthorized' });\n\n  try {\n    jwt.verify(token, process.env.JWT_SECRET!);\n    next();\n  } catch {\n    res.status(401).json({ message: 'Invalid token' });\n  }\n}"
    },
    {
      "path": "backend/tests/auth.test.ts",
      "language": "typescript",
      "content": "describe('Authentication', () => {\n  it('should login successfully', () => {\n    expect(true).toBe(true);\n  });\n}"
    }
  ]
}
      
      
    
  ],
  isGenerating: false,
  error: null,
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
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateVoiceCommand.pending, (state) => {
        state.isGenerating = true;
        state.error = null;
      })
      .addCase(generateVoiceCommand.fulfilled, (state, action: PayloadAction<VoiceCommand>) => {
        state.isGenerating = false;
        // Add or update the command
        const existingIndex = state.commands.findIndex((c) => c.id === action.payload.id);
        if (existingIndex >= 0) {
          state.commands[existingIndex] = action.payload;
        } else {
          state.commands.unshift(action.payload);
        }
      })
      .addCase(generateVoiceCommand.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.payload || "Voice command generation failed";
      })
      .addCase(getVoiceHistory.fulfilled, (state, action: PayloadAction<VoiceCommand[]>) => {
        state.commands = action.payload;
      });
  },
});

export const { setListening, setCurrentTranscript, addCommand, updateCommandStatus, clearError } =
  voiceSlice.actions;
export default voiceSlice.reducer;
