import axios from "axios";
import { API_BASE } from "../constants/constants";
import api from "../api/api";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO datetime, or ISO date if allDay
  end: string;
  allDay: boolean;
  location: string | null;
  meetingUrl: string | null;
  attendees: string[];
  status: "confirmed" | "tentative" | "cancelled";
  htmlLink: string;
}

export interface CalendarStatus {
  connected: boolean;
  email: string | null;
  lastSyncAt: string | null;
}

const calendarApi = api

export const calendarService = {
  /**
   * Full-page redirect into the existing OAuth flow
   * (connectGoogle in googleCalendar.controller.ts).
   */
  connect: (userId: string): void => {
    window.location.href = `${API_BASE}/calendar/connect?userId=${userId}`;
  },

  disconnect: async (userId: string): Promise<{ success: boolean }> => {
    const { data } = await calendarApi.post("/calendar/disconnect", { userId });
    return data;
  },

  getStatus: async (userId: string): Promise<CalendarStatus> => {
    const { data } = await calendarApi.get("/calendar/status", {
      params: { userId },
    });
    return data;
  },

  /**
   * Lists events in a date range (defaults to "next 7 days" if the caller
   * doesn't pass one) — backed by calendar.events.list on the connected
   * Google account, same as the webhook handler already uses server-side.
   */
  getEvents: async (
    userId: string,
    range?: { timeMin?: string; timeMax?: string }
  ): Promise<CalendarEvent[]> => {
    const { data } = await calendarApi.get("/calendar/events", {
      params: { userId, ...range },
    });
    return data;
  },
};