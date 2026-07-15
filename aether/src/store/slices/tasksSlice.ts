import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Task } from "../types";
import { fetchDailyDigest } from "../../services/dashboard";

interface TasksState {
  tasks: Task[];
  yesterday : string;
  prediction:string;
  loading: boolean;
}

const initialState: TasksState = {
  tasks: [
  ],
  yesterday:"",
  prediction:"",
  loading: false
};

const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    toggleTask(state, action: PayloadAction<string>) {
      const task = state.tasks.find((t) => t.id === action.payload);
      if (task) {
        task.status = task.status === "done" ? "open" : "done";
      }
    },
    addTask(state, action: PayloadAction<Task>) {
      state.tasks.unshift(action.payload);
    },
    updateTaskStatus(
      state,
      action: PayloadAction<{ id: string; status: Task["status"] }>
    ) {
      const task = state.tasks.find((t) => t.id === action.payload.id);
      if (task) task.status = action.payload.status;
    },
    
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDailyDigest.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchDailyDigest.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload.tasks;
        state.yesterday = action.payload.yesterday;
        state.prediction = action.payload.prediction;
      })
      .addCase(fetchDailyDigest.rejected, (state) => {
        state.loading = false;
      });
  }
});

export const { toggleTask, addTask, updateTaskStatus } = tasksSlice.actions;
export default tasksSlice.reducer;
