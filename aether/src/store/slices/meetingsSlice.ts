import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { fetchMeetings, uploadMeetingRecording,createJiraTicketsForMeeting,emailMeetingSummary  , type Meeting, ApiError } from "../../services/meetings";


interface MeetingsState {
  meetings: Meeting[];
  isUploading: boolean;
  isLoading: boolean;
  ticketsLoadingId: string | null;
  emailLoadingId: string | null;
  error: string | null;
}

const initialState: MeetingsState = {
  meetings: [],
  isUploading: false,
  isLoading: false,
  ticketsLoadingId: null,
  emailLoadingId: null,
  error: null,
};

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export const loadMeetings = createAsyncThunk("meetings/load", async (_: void, { rejectWithValue }) => {
  try {
    return await fetchMeetings();
  } catch (err) {
    return rejectWithValue(errorMessage(err));
  }
});

export const uploadMeeting = createAsyncThunk(
  "meetings/upload",
  async (file: File, { rejectWithValue }) => {
    try {
      return await uploadMeetingRecording(file);
    } catch (err) {
      return rejectWithValue(errorMessage(err));
    }
  }
);

export const generateJiraTickets = createAsyncThunk(
  "meetings/generateJiraTickets",
  async (meetingId: string, { rejectWithValue }) => {
    try {
      const result = await createJiraTicketsForMeeting(meetingId);
      return result.meeting;
    } catch (err) {
      return rejectWithValue(errorMessage(err));
    }
  }
);

export const generateEmailSummary = createAsyncThunk(
  "meetings/generateEmailSummary",
  async (meetingId: string, { rejectWithValue }) => {
    try {
      const result = await emailMeetingSummary(meetingId);
      return result.meeting;
    } catch (err) {
      return rejectWithValue(errorMessage(err));
    }
  }
);

const meetingsSlice = createSlice({
  name: "meetings",
  initialState,
  reducers: {
    clearMeetingsError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // load
      .addCase(loadMeetings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadMeetings.fulfilled, (state, action: PayloadAction<Meeting[]>) => {
        state.isLoading = false;
        state.meetings = action.payload;
      })
      .addCase(loadMeetings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || "Failed to load meetings";
      })
      // upload
      .addCase(uploadMeeting.pending, (state) => {
        state.isUploading = true;
        state.error = null;
      })
      .addCase(uploadMeeting.fulfilled, (state, action: PayloadAction<Meeting>) => {
        state.isUploading = false;
        state.meetings.unshift(action.payload);
      })
      .addCase(uploadMeeting.rejected, (state, action) => {
        state.isUploading = false;
        state.error = (action.payload as string) || "Failed to process recording";
      })
      // jira tickets
      .addCase(generateJiraTickets.pending, (state, action) => {
        state.ticketsLoadingId = action.meta.arg;
        state.error = null;
      })
      .addCase(generateJiraTickets.fulfilled, (state, action: PayloadAction<Meeting>) => {
        state.ticketsLoadingId = null;
        const idx = state.meetings.findIndex((m) => m.id === action.payload.id);
        if (idx !== -1) state.meetings[idx] = action.payload;
      })
      .addCase(generateJiraTickets.rejected, (state, action) => {
        state.ticketsLoadingId = null;
        state.error = (action.payload as string) || "Failed to generate tickets";
      })
      // email summary
      .addCase(generateEmailSummary.pending, (state, action) => {
        state.emailLoadingId = action.meta.arg;
        state.error = null;
      })
      .addCase(generateEmailSummary.fulfilled, (state, action: PayloadAction<Meeting>) => {
        state.emailLoadingId = null;
        const idx = state.meetings.findIndex((m) => m.id === action.payload.id);
        if (idx !== -1) state.meetings[idx] = action.payload;
      })
      .addCase(generateEmailSummary.rejected, (state, action) => {
        state.emailLoadingId = null;
        state.error = (action.payload as string) || "Failed to generate email summary";
      });
  },
});

export const { clearMeetingsError } = meetingsSlice.actions;
export default meetingsSlice.reducer;