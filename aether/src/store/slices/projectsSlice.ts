import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Project } from "../types";
import { fetchUserProjects } from "../../services/dashboard";

interface ProjectsState {
  projects: Project[];
  currentProjectId: string | null;
  currentRepoId:string | null;
  loading: boolean;
}

const initialState: ProjectsState = {
  projects: [
   
  ],
  currentProjectId: "",
  currentRepoId:"",
  loading: false
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
    setCurrentRepoId(state, action: PayloadAction<string>) {
      console.log(action.payload)
      state.currentRepoId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProjects.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUserProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload.projects;
      })
      .addCase(fetchUserProjects.rejected, (state) => {
        state.loading = false;
      });
  }

});

export const { setCurrentProject, addProject,setCurrentRepoId } = projectsSlice.actions;
export default projectsSlice.reducer;
