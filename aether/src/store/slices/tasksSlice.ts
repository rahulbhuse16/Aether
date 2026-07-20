import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Task } from "../types";
import { fetchDailyDigest } from "../../services/dashboard";
import { createTaskRemote, updateTaskStatusRemote, toggleTaskRemote } from "../../services/taskplanner";


interface TasksState {
  tasks: Task[];
  yesterday: string;
  prediction: string;
  loading: boolean;
  error: string | null;
}

const initialState: TasksState = {
  tasks: [],
  yesterday: "",
  prediction: "",
  loading: false,
  error: null,
};

function upsert(tasks: Task[], task: Task) {
  const idx = tasks.findIndex((t) => t.id === task.id);
  if (idx === -1) {
    tasks.unshift(task);
  } else {
    tasks[idx] = task;
  }
}

const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    // Kept for instant, optimistic local feedback before the network round-trip resolves.
    toggleTask(state, action: PayloadAction<string>) {
      const task = state.tasks.find((t) => t.id === action.payload);
      if (task) task.status = task.status === "done" ? "open" : "done";
    },
    addTask(state, action: PayloadAction<Task>) {
      state.tasks.unshift(action.payload);
    },
    updateTaskStatus(state, action: PayloadAction<{ id: string; status: Task["status"] }>) {
      const task = state.tasks.find((t) => t.id === action.payload.id);
      if (task) task.status = action.payload.status;
    },
    clearTasksError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // --- initial load AND every poll / refetch-on-focus ---
      // fetchDailyDigest is what picks up changes GitHub's webhook already
      // wrote into Mongo — there's no separate "push" path from the server.
      .addCase(fetchDailyDigest.pending, (state) => {
        // Only show the full skeleton on the very first load, not on background
        // polls/refetch-on-focus, so those don't blank the board mid-glance.
        state.loading = state.tasks.length === 0;
        state.error = null;
      })
      .addCase(fetchDailyDigest.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload.tasks;
        state.yesterday = action.payload.yesterday;
        state.prediction = action.payload.prediction;
      })
      .addCase(fetchDailyDigest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string ?? "Something went wrong loading your tasks.";
      })

      // --- create ---
      .addCase(createTaskRemote.fulfilled, (state, action) => {
        upsert(state.tasks, action.payload);
      })
      .addCase(createTaskRemote.rejected, (state, action) => {
        state.error = action.payload ?? "Failed to create task.";
      })

      // --- status update / toggle: reconcile optimistic update with server truth ---
      .addCase(updateTaskStatusRemote.fulfilled, (state, action) => {
        upsert(state.tasks, action.payload);
      })
      .addCase(updateTaskStatusRemote.rejected, (state, action) => {
        state.error = action.payload ?? "Failed to update task status.";
      })
      .addCase(toggleTaskRemote.fulfilled, (state, action) => {
        upsert(state.tasks, action.payload);
      })
      .addCase(toggleTaskRemote.rejected, (state, action) => {
        state.error = action.payload ?? "Failed to toggle task.";
      });
  },
});

export const { toggleTask, addTask, updateTaskStatus, clearTasksError } = tasksSlice.actions;

export default tasksSlice.reducer;