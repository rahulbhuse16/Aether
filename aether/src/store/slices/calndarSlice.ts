import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { calendarService,type CalendarEvent } from "../../services/calendar";

interface CalendarState {
  connected: boolean;
  email: string | null;
  lastSyncAt: string | null;
  events: CalendarEvent[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

/**
 * Mock events so the page renders something real before /calendar/status
 * and /calendar/events exist on the backend. Dates are relative to
 * "today" so this stays realistic no matter when it's viewed. A failed
 * fetch leaves this in place instead of showing an empty page.
 */
function mockEventsFromToday(): CalendarEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const at = (dayOffset: number, hour: number, minute = 0) => {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  return [
    {
      id: "evt-1",
      title: "Daily Standup",
      start: at(0, 9, 30),
      end: at(0, 9, 45),
      allDay: false,
      location: null,
      meetingUrl: "https://meet.google.com/abc-defg-hij",
      attendees: ["Rahul", "Priya", "You"],
      status: "confirmed",
      htmlLink: "https://calendar.google.com/event?eid=evt1",
    },
    {
      id: "evt-2",
      title: "Sprint Planning",
      start: at(0, 11, 0),
      end: at(0, 12, 0),
      allDay: false,
      location: "Conference Room B",
      meetingUrl: null,
      attendees: ["Rahul", "Priya", "Aditi", "You"],
      status: "confirmed",
      htmlLink: "https://calendar.google.com/event?eid=evt2",
    },
    {
      id: "evt-3",
      title: "1:1 with Manager",
      start: at(1, 15, 0),
      end: at(1, 15, 30),
      allDay: false,
      location: null,
      meetingUrl: "https://meet.google.com/xyz-mnop-qrs",
      attendees: ["Manager", "You"],
      status: "confirmed",
      htmlLink: "https://calendar.google.com/event?eid=evt3",
    },
    {
      id: "evt-4",
      title: "Code Review: Auth Middleware Refactor",
      start: at(2, 14, 0),
      end: at(2, 14, 45),
      allDay: false,
      location: null,
      meetingUrl: "https://meet.google.com/lmn-opqr-stu",
      attendees: ["Aditi", "You"],
      status: "tentative",
      htmlLink: "https://calendar.google.com/event?eid=evt4",
    },
    {
      id: "evt-5",
      title: "Client Call — Q3 Roadmap",
      start: at(3, 10, 0),
      end: at(3, 11, 0),
      allDay: false,
      location: null,
      meetingUrl: "https://meet.google.com/def-ghij-klm",
      attendees: ["Client Team", "You"],
      status: "confirmed",
      htmlLink: "https://calendar.google.com/event?eid=evt5",
    },
    {
      id: "evt-6",
      title: "Team Offsite",
      start: at(5, 0, 0),
      end: at(5, 23, 59),
      allDay: true,
      location: "Rooftop Lounge",
      meetingUrl: null,
      attendees: ["Whole Team"],
      status: "confirmed",
      htmlLink: "https://calendar.google.com/event?eid=evt6",
    },
  ];
}

const initialState: CalendarState = {
  connected: false,
  email: "you@example.com",
  lastSyncAt: '',
  events: [],
  status: "idle",
  error: null,
};

export const fetchCalendarStatus = createAsyncThunk(
  "calendar/fetchStatus",
  async (userId: string) => {
    return await calendarService.getStatus(userId);
  }
);

export const fetchCalendarEvents = createAsyncThunk(
  "calendar/fetchEvents",
  async (args: { userId: string; timeMin?: string; timeMax?: string }) => {
    return await calendarService.getEvents(args.userId, {
      timeMin: args.timeMin,
      timeMax: args.timeMax,
    });
  }
);

export const disconnectCalendar = createAsyncThunk(
  "calendar/disconnect",
  async (userId: string) => {
    await calendarService.disconnect(userId);
    return userId;
  }
);

const calendarSlice = createSlice({
  name: "calendar",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCalendarStatus.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchCalendarStatus.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.connected = action.payload.connected;
        state.email = action.payload.email;
        state.lastSyncAt = action.payload.lastSyncAt;
      })
      .addCase(fetchCalendarStatus.rejected, (state, action) => {
        // Keep the mock/previous state visible; just surface the error.
        state.status = "failed";
        state.error = action.error.message ?? "Failed to load calendar status";
      })
      .addCase(fetchCalendarEvents.fulfilled, (state, action) => {
        if (action.payload.length) {
          state.events = action.payload;
        }
      })
      .addCase(fetchCalendarEvents.rejected, (state, action) => {
        state.error = action.error.message ?? "Failed to load calendar events";
      })
      .addCase(disconnectCalendar.fulfilled, (state) => {
        state.connected = false;
        state.email = null;
        state.events = [];
      });
  },
});

export default calendarSlice.reducer;