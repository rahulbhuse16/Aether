import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import {type BugAnalysisReport,analyzeRepository,
  fetchBugReports,
  fetchBugReportById,
  deleteBugReport, } from "../../services/bugFinder";

interface BugsState {
  reports: BugAnalysisReport[];
  currentReport: BugAnalysisReport | null;

  repoUrlInput: string;
  branchInput: string;
  focusPathInput: string;
  stackTraceInput: string;

  isAnalyzing: boolean;
  isLoadingReports: boolean;
  isLoadingReport: boolean;

  analyzeError: string | null;
  reportsError: string | null;
}

const initialState: BugsState = {
  reports: [],
  currentReport: null,

  repoUrlInput: "",
  branchInput: "",
  focusPathInput: "",
  stackTraceInput: "",

  isAnalyzing: false,
  isLoadingReports: false,
  isLoadingReport: false,

  analyzeError: null,
  reportsError: null,
};

const bugsSlice = createSlice({
  name: "bugs",
  initialState,
  reducers: {
    setRepoUrlInput(state, action: PayloadAction<string>) {
      state.repoUrlInput = action.payload;
    },
    setBranchInput(state, action: PayloadAction<string>) {
      state.branchInput = action.payload;
    },
    setFocusPathInput(state, action: PayloadAction<string>) {
      state.focusPathInput = action.payload;
    },
    setStackTraceInput(state, action: PayloadAction<string>) {
      state.stackTraceInput = action.payload;
    },
    clearCurrentReport(state) {
      state.currentReport = null;
    },
    clearAnalyzeError(state) {
      state.analyzeError = null;
    },
    resetBugFinderForm(state) {
      state.repoUrlInput = "";
      state.branchInput = "";
      state.focusPathInput = "";
      state.stackTraceInput = "";
    },
  },
  extraReducers: (builder) => {
    builder
      // ---- analyzeRepository ----
      .addCase(analyzeRepository.pending, (state) => {
        state.isAnalyzing = true;
        state.analyzeError = null;
      })
      .addCase(
        analyzeRepository.fulfilled,
        (state, action: PayloadAction<BugAnalysisReport>) => {
          state.isAnalyzing = false;
          state.reports.unshift(action.payload);
          state.currentReport = action.payload;
          state.repoUrlInput = "";
          state.branchInput = "";
          state.focusPathInput = "";
          state.stackTraceInput = "";
        }
      )
      .addCase(analyzeRepository.rejected, (state, action) => {
        state.isAnalyzing = false;
        state.analyzeError = action.payload || "Repository analysis failed";
      })

      // ---- fetchBugReports ----
      .addCase(fetchBugReports.pending, (state) => {
        state.isLoadingReports = true;
        state.reportsError = null;
      })
      .addCase(
        fetchBugReports.fulfilled,
        (state, action: PayloadAction<BugAnalysisReport[]>) => {
          state.isLoadingReports = false;
          state.reports = action.payload;
        }
      )
      .addCase(fetchBugReports.rejected, (state, action) => {
        state.isLoadingReports = false;
        state.reportsError = action.payload || "Failed to load reports";
      })

      // ---- fetchBugReportById ----
      .addCase(fetchBugReportById.pending, (state) => {
        state.isLoadingReport = true;
      })
      .addCase(
        fetchBugReportById.fulfilled,
        (state, action: PayloadAction<BugAnalysisReport>) => {
          state.isLoadingReport = false;
          state.currentReport = action.payload;
        }
      )
      .addCase(fetchBugReportById.rejected, (state) => {
        state.isLoadingReport = false;
      })

      // ---- deleteBugReport ----
      .addCase(deleteBugReport.fulfilled, (state, action: PayloadAction<string>) => {
        state.reports = state.reports.filter((r) => r.id !== action.payload);
        if (state.currentReport?.id === action.payload) {
          state.currentReport = null;
        }
      });
  },
});

export const {
  setRepoUrlInput,
  setBranchInput,
  setFocusPathInput,
  setStackTraceInput,
  clearCurrentReport,
  clearAnalyzeError,
  resetBugFinderForm,
} = bugsSlice.actions;

export default bugsSlice.reducer;