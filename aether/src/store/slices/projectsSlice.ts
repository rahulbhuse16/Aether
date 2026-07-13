import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Project } from "../types";

interface ProjectsState {
  projects: Project[];
  currentProjectId: string | null;
}

const initialState: ProjectsState = {
  projects: [
    { id: "p1", name: "Aether Core", repo: "aether/core", openTasks: 6, lastActivity: "2h ago" },
    { id: "p2", name: "Billing Service", repo: "aether/billing", openTasks: 2, lastActivity: "1d ago" },
    { id: "p3", name: "CRM", repo: "aether/crm", openTasks: 4, lastActivity: "3h ago" },
    { id: "p4", name: "Smart Lock", repo: "aether/smart-lock", openTasks: 1, lastActivity: "5h ago" },
  ],
  currentProjectId: "p1",
};

const projectsSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {
    setCurrentProject(state, action: PayloadAction<string>) {
      state.currentProjectId = action.payload;
    },
    addProject(state, action: PayloadAction<Project>) {
      state.projects.push(action.payload);
      state.currentProjectId = action.payload.id;
    },
  },
});

export const { setCurrentProject, addProject } = projectsSlice.actions;
export default projectsSlice.reducer;
