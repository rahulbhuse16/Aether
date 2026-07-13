import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { BugReport } from "../types";

interface BugsState {
  reports: BugReport[];
  stackTraceInput: string;
  isAnalyzing: boolean;
}

const initialState: BugsState = {
  stackTraceInput: "",
  isAnalyzing: false,
  reports: [
    {
      id: "b1",
      title: "AuthProvider context missing",
      severity: "critical",
      stackTrace:
        "Error: useAuth must be used within AuthProvider\n  at useAuth (auth.tsx:24)\n  at Dashboard (Dashboard.tsx:18)",
      rootCause: "Dashboard component rendered outside AuthProvider wrapper in the route tree.",
      fix: "Wrap the Dashboard route inside <AuthProvider> in Router.tsx.",
    },
    {
      id: "b2",
      title: "Null reference in payment handler",
      severity: "high",
      stackTrace:
        "TypeError: Cannot read properties of null (reading 'amount')\n  at processPayment (payment.ts:87)",
      rootCause: "Payment object is null when webhook fires before order creation completes.",
      fix: "Add null check and retry queue: if (!payment) return enqueueRetry(webhookPayload);",
    },
  ],
};

const bugsSlice = createSlice({
  name: "bugs",
  initialState,
  reducers: {
    setStackTraceInput(state, action: PayloadAction<string>) {
      state.stackTraceInput = action.payload;
    },
    setAnalyzing(state, action: PayloadAction<boolean>) {
      state.isAnalyzing = action.payload;
    },
    addReport(state, action: PayloadAction<BugReport>) {
      state.reports.unshift(action.payload);
    },
  },
});

export const { setStackTraceInput, setAnalyzing, addReport } = bugsSlice.actions;
export default bugsSlice.reducer;
