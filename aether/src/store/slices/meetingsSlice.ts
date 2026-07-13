import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Meeting } from "../types";

interface MeetingsState {
  meetings: Meeting[];
  isUploading: boolean;
}

const initialState: MeetingsState = {
  meetings: [
    {
      id: "mt1",
      title: "Sprint Planning — Week 24",
      date: "Jul 12, 2026",
      duration: "47 min",
      status: "ready",
      summary:
        "Team aligned on payment service optimization and auth module refactor. Redis cache layer identified as priority.",
      actionItems: [
        "Optimize Redis cache layer (Rahul, 18 min est.)",
        "Split Auth Module into microservice (Sarah)",
        "Create Jira tickets for PR #42 findings",
        "Schedule load test for payment service",
      ],
    },
    {
      id: "mt2",
      title: "Architecture Review — CRM Migration",
      date: "Jul 10, 2026",
      duration: "32 min",
      status: "ready",
      summary: "Discussed Redux to Zustand migration path and API gateway patterns.",
      actionItems: [
        "Draft migration plan document",
        "Set up feature flags for gradual rollout",
      ],
    },
  ],
  isUploading: false,
};

const meetingsSlice = createSlice({
  name: "meetings",
  initialState,
  reducers: {
    setUploading(state, action: PayloadAction<boolean>) {
      state.isUploading = action.payload;
    },
    addMeeting(state, action: PayloadAction<Meeting>) {
      state.meetings.unshift(action.payload);
    },
  },
});

export const { setUploading, addMeeting } = meetingsSlice.actions;
export default meetingsSlice.reducer;
