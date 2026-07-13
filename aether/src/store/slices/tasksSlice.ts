import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Task } from "../types";

interface TasksState {
  tasks: Task[];
}

const initialState: TasksState = {
  tasks: [
    { id: "t1", title: "Fix login bug", status: "in_progress", source: "github", priority: "high" },
    { id: "t2", title: "Review PR #42", status: "open", source: "github", priority: "medium" },
    { id: "t3", title: "Deploy backend to staging", status: "open", source: "jira", priority: "medium" },
    { id: "t4", title: "Payment service memory usage rising — investigate", status: "open", source: "ai", priority: "high" },
    { id: "t5", title: "Meeting at 3 PM — sprint planning", status: "open", source: "ai", priority: "low", dueDate: "Today" },
    { id: "t6", title: "Optimize Redis cache layer", status: "open", source: "ai", priority: "high" },
  ],
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
});

export const { toggleTask, addTask, updateTaskStatus } = tasksSlice.actions;
export default tasksSlice.reducer;
