import axios from "axios";
import { API_BASE } from "../constants/constants";
import api from "../api/api";

export type Priority = "low" | "medium" | "high";

export interface MentionEvent {
  id: string;
  channel: string;
  userName: string;
  question: string;
  response: string;
  confidence?: number;
  relatedGithubIssue?: string;
  timestamp: string;
}

export interface SlackTask {
  id: string;
  title: string;
  priority: Priority;
  status: "open" | "in_progress" | "done";
  createdBy: string;
  source: "slack";
  createdAt: string;
}

export interface BugAnalysis {
  id: string;
  channel: string;
  userName: string;
  errorSnippet: string;
  rootCause: string;
  recommendedFix: string;
  confidence: number;
  timestamp: string;
}

export interface GithubSlackNotification {
  id: string;
  repository: string;
  issueTitle: string;
  priority: Priority;
  assignedTo: string;
  aiAnalysis: string;
  githubUrl: string;
  aetherUrl: string;
  timestamp: string;
}

export interface DailySummary {
  date: string;
  githubOpened: number;
  githubClosed: number;
  highPriorityBugs: number;
  tasksCompleted: number;
  tasksOverdue: number;
  insights: string[];
  recommendedAction: string;
}

const aetherApi = api

export const aetherSlackService = {
  getMentionActivity: async (userId: string): Promise<MentionEvent[]> => {
    const { data } = await aetherApi.get("/slack/mentions", {
      params: { userId },
    });
    return data;
  },

  getSlackTasks: async (userId: string): Promise<SlackTask[]> => {
    const { data } = await aetherApi.get("/slack/tasks", {
      params: { userId },
    });
    return data;
  },

  getBugAnalyses: async (userId: string): Promise<BugAnalysis[]> => {
    const { data } = await aetherApi.get("/slack/bug-analyses", {
      params: { userId },
    });
    return data;
  },

  getGithubNotifications: async (
    userId: string
  ): Promise<GithubSlackNotification[]> => {
    const { data } = await aetherApi.get("/slack/github-notifications", {
      params: { userId },
    });
    return data;
  },

  getDailySummary: async (userId: string): Promise<DailySummary> => {
    const { data } = await aetherApi.get("/slack/daily-summary", {
      params: { userId },
    });
    return data;
  },

  sendDailySummaryNow: async (
    userId: string,
    channelId: string
  ): Promise<{ success: boolean; sentAt: string }> => {
    const { data } = await aetherApi.post("/slack/daily-summary/send", {
      userId,
      channelId,
    });
    return data;
  },
};