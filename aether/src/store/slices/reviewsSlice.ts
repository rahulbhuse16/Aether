import { createSlice,type PayloadAction } from "@reduxjs/toolkit";
import type { PullRequest } from "../types";
import { analyzePullRequest ,setPullRequestByFetching} from "../../services/codeReviews";

interface ReviewsState {
  pullRequests: PullRequest[];
  selectedPrId: string | null;
  isAnalyzing: boolean;
  isLoading : boolean;
}

const initialState: ReviewsState = {
  pullRequests: [
   
  ],
  selectedPrId: "",
  isAnalyzing: false,
  isLoading:false
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
  extraReducers: (builder) => {
    builder
      .addCase(analyzePullRequest.pending, (state) => {
        state.isAnalyzing = true;
      })
      .addCase(analyzePullRequest.fulfilled, (state, action) => {
        state.isAnalyzing = false;
        const pr = state.pullRequests.find((p) => p.id === action.payload.prId);
        if (pr) {
          pr.reviewed = true;
          pr.findings = action.payload.findings;
        }
      })
      .addCase(analyzePullRequest.rejected, (state) => {
        state.isAnalyzing = false;
      })
      .addCase(setPullRequestByFetching.fulfilled, (state,action) => {
        state.pullRequests = action.payload.pullRequests ;
        state.isLoading = false;
      })
      .addCase(setPullRequestByFetching.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(setPullRequestByFetching.rejected, (state) => {
        state.isLoading = false;
      })
      ;
  },
});

export const { selectPr, setAnalyzing, markReviewed } = reviewsSlice.actions;
export default reviewsSlice.reducer;
