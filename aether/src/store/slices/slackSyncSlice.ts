import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  aetherSlackService,
 type MentionEvent,
 type SlackTask,
 type BugAnalysis,
 type GithubSlackNotification,
type  DailySummary,
} from "../../services/slack-sync";

interface AetherSlackState {
  mentions: MentionEvent[];
  tasks: SlackTask[];
  bugAnalyses: BugAnalysis[];
  githubNotifications: GithubSlackNotification[];
  dailySummary: DailySummary | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  sendSummaryStatus: "idle" | "sending" | "sent" | "failed";
  error: string | null;
}

/**
 * Placeholder data mirroring the product spec examples, shown until the
 * backend endpoints for the Aether-as-AI-teammate Slack features are live.
 * Any successful fetch below overwrites the relevant slice of this state;
 * a failed fetch leaves it in place instead of showing an empty page.
 */
const initialState: AetherSlackState = {
  mentions: [
    {
      id: "mn1",
      channel: "eng-alerts",
      userName: "Rahul",
      question: "@Aether analyze issue #142",
      response:
        "Issue #142 appears to be caused by a null user reference. Recommended fix: add validation in UserService, add a database constraint, add a regression test.",
      confidence: 88,
      relatedGithubIssue: "#142",
      timestamp: "2026-07-22T08:40:00.000Z",
    },
  ],
  tasks: [
    {
      id: "tk1",
      title: "Fix authentication timeout issue",
      priority: "high",
      status: "open",
      createdBy: "Rahul",
      source: "slack",
      createdAt: "2026-07-22T08:45:00.000Z",
    },
  ],
  bugAnalyses: [
    {
      id: "bg1",
      channel: "general",
      userName: "Rahul",
      errorSnippet: "JavaScript heap out of memory",
      rootCause: "The Node.js process is exceeding the V8 heap limit.",
      recommendedFix: "NODE_OPTIONS=--max-old-space-size=4096",
      confidence: 92,
      timestamp: "2026-07-22T09:05:00.000Z",
    },
  ],
  githubNotifications: [
    {
      id: "gn1",
      repository: "aether-backend",
      issueTitle: "Production API returning 500",
      priority: "high",
      assignedTo: "Rahul",
      aiAnalysis:
        "The issue appears related to MongoDB connection handling.",
      githubUrl: "https://github.com/aether/aether-backend/issues/142",
      aetherUrl: "/tasks/gn1",
      timestamp: "2026-07-22T07:50:00.000Z",
    },
  ],
  dailySummary: {
    date: "2026-07-22",
    githubOpened: 8,
    githubClosed: 5,
    highPriorityBugs: 2,
    tasksCompleted: 12,
    tasksOverdue: 4,
    insights: ["Authentication-related issues increased 30% this week."],
    recommendedAction:
      "Review the auth middleware and token refresh flow.",
  },
  status: "idle",
  sendSummaryStatus: "idle",
  error: null,
};

export const fetchAetherSlackFeed = createAsyncThunk(
  "aetherSlack/fetchFeed",
  async (userId: string) => {
    const [mentions, tasks, bugAnalyses, githubNotifications, dailySummary] =
      await Promise.all([
        aetherSlackService.getMentionActivity(userId),
        aetherSlackService.getSlackTasks(userId),
        aetherSlackService.getBugAnalyses(userId),
        aetherSlackService.getGithubNotifications(userId),
        aetherSlackService.getDailySummary(userId),
      ]);
    return { mentions, tasks, bugAnalyses, githubNotifications, dailySummary };
  }
);

export const sendDailySummaryNow = createAsyncThunk(
  "aetherSlack/sendDailySummaryNow",
  async ({userId,channelId}: {userId: string, channelId: string}) => {
    return await aetherSlackService.sendDailySummaryNow(userId,channelId);
  }
);

const aetherSlackSlice = createSlice({
  name: "aetherSlack",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAetherSlackFeed.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAetherSlackFeed.fulfilled, (state, action) => {
        state.status = "succeeded";
        if (action.payload.mentions?.length) state.mentions = action.payload.mentions;
        if (action.payload.tasks?.length) state.tasks = action.payload.tasks;
        if (action.payload.bugAnalyses?.length)
          state.bugAnalyses = action.payload.bugAnalyses;
        if (action.payload.githubNotifications?.length)
          state.githubNotifications = action.payload.githubNotifications;
        if (action.payload.dailySummary) state.dailySummary = action.payload.dailySummary;
      })
      .addCase(fetchAetherSlackFeed.rejected, (state, action) => {
        // Keep the dummy/previous feed visible; just surface the error.
        state.status = "failed";
        state.error = action.error.message ?? "Failed to load Aether activity";
      })
      .addCase(sendDailySummaryNow.pending, (state) => {
        state.sendSummaryStatus = "sending";
      })
      .addCase(sendDailySummaryNow.fulfilled, (state) => {
        state.sendSummaryStatus = "sent";
      })
      .addCase(sendDailySummaryNow.rejected, (state) => {
        state.sendSummaryStatus = "failed";
      });
  },
});

export default aetherSlackSlice.reducer;