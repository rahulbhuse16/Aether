export interface Task {
  id: string;
  title: string;
  status: "open" | "in_progress" | "done";
  source: "github" | "jira" | "ai";
  priority?: "high" | "medium" | "low";
  dueDate?: string;
  githubIssueNumber?: number;
  githubIssueUrl?: string;
  projectId : string;
  syncToGithub?: boolean;
}


import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/api";



export interface DailyDigestResponse {
  tasks: Task[];
  yesterday: string;
  prediction: string;
}

const userId=localStorage.getItem('userId')

/** POST /tasks — optimistic create, with optional GitHub issue creation */
export const createTaskRemote = createAsyncThunk<Task, Task & { syncToGithub?: boolean }, { rejectValue: string }>(
  "tasks/createTaskRemote",
  async (task, { rejectWithValue }) => {
    try {
      const { data } = await api.post<Task>("/task-planner/", {...task,userId,
        syncToGithub: task.syncToGithub ?? false,
      });
      return data;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error ?? "Failed to create task");
    }
  }
);

/** PATCH /tasks/:id/status */
export const updateTaskStatusRemote = createAsyncThunk<
  Task,
  { id: string; status: Task["status"] },
  { rejectValue: string }
>("tasks/updateTaskStatusRemote", async ({ id, status }, { rejectWithValue }) => {
  try {
    const { data } = await api.patch<Task>(`/task-planner/${id}/status`, { status,userId });
    return data;
  } catch (err: any) {
    return rejectWithValue(err?.response?.data?.error ?? "Failed to update task status");
  }
});

/** PATCH /tasks/:id/toggle */
export const toggleTaskRemote = createAsyncThunk<Task, string, { rejectValue: string }>(
  "tasks/toggleTaskRemote",
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.patch<Task>(`/task-planner/${id}/toggle`,{userId});
      return data;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error ?? "Failed to toggle task");
    }
  }
);