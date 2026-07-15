// Path: src/services/repoChat.ts
//
// Talks to repoChatController.ts. One call: send a message (plus a slice
// of recent history for continuity) for the currently indexed project,
// get back one grounded assistant ChatMessage with source citations.

import axios from "axios";

const API_BASE = "https://aether-api-y0ob.onrender.com/api/v1";

export interface ChatHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export interface RepoChatMessage {
  id: string;
  role: "assistant";
  content: string;
  timestamp: string;
  sources: string[];
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return typeof body?.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export async function sendRepoChatMessage(
  projectId: string,
  message: string,
  history: ChatHistoryTurn[]
): Promise<RepoChatMessage> {
  const res = await axios.post(`${API_BASE}/chat/message`, {
    projectId,
    message,
    history,
    userId : localStorage.getItem("userId") as string
  });

  if (!res.data) {
    throw new Error(await readErrorMessage(res.data, "Couldn't reach the repository chat right now."));
  }

  const data = await res.data;
  return data.message as RepoChatMessage;
}