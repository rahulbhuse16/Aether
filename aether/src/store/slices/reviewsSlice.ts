import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PullRequest } from "../types";

interface ReviewsState {
  pullRequests: PullRequest[];
  selectedPrId: string | null;
  isAnalyzing: boolean;
}

const initialState: ReviewsState = {
  pullRequests: [
    {
      id: "pr1",
      number: 42,
      title: "feat: add JWT refresh token rotation",
      author: "sarah.chen",
      status: "open",
      reviewed: true,
      findings: [
        {
          id: "f1",
          line: 214,
          category: "bug",
          message: "Possible null pointer on token decode",
          suggestion: "Use optional chaining: token?.payload?.sub",
        },
        {
          id: "f2",
          line: 89,
          category: "performance",
          message: "Array filtered 4 times in loop",
          suggestion: "Use Map for O(1) lookups instead of repeated .filter()",
        },
        {
          id: "f3",
          line: 12,
          category: "security",
          message: "JWT secret exposed in config",
          suggestion: "Move to environment variable: process.env.JWT_SECRET",
        },
      ],
    },
    {
      id: "pr2",
      number: 38,
      title: "fix: payment webhook retry logic",
      author: "rahul.verma",
      status: "open",
      reviewed: false,
    },
    {
      id: "pr3",
      number: 35,
      title: "chore: upgrade Redis client",
      author: "alex.kim",
      status: "open",
      reviewed: false,
    },
  ],
  selectedPrId: "pr1",
  isAnalyzing: false,
};

const reviewsSlice = createSlice({
  name: "reviews",
  initialState,
  reducers: {
    selectPr(state, action: PayloadAction<string>) {
      state.selectedPrId = action.payload;
    },
    setAnalyzing(state, action: PayloadAction<boolean>) {
      state.isAnalyzing = action.payload;
    },
    markReviewed(state, action: PayloadAction<string>) {
      const pr = state.pullRequests.find((p) => p.id === action.payload);
      if (pr) pr.reviewed = true;
    },
  },
});

export const { selectPr, setAnalyzing, markReviewed } = reviewsSlice.actions;
export default reviewsSlice.reducer;
