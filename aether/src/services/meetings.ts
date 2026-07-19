import axios, { AxiosError } from "axios";
import { API_BASE } from "../constants/constants";

const API_BASE_URL = API_BASE;

export type MeetingStatus = "processing" | "ready" | "failed";

export interface JiraTicket {
  id: string;
  key?: string;
  summary: string;
  description: string;
  priority: "Low" | "Medium" | "High";
  url?: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: string;
  status: MeetingStatus;
  summary: string;
  actionItems: string[];
  ticketsCreated: boolean;
  tickets: JiraTicket[];
  emailSent: boolean;
  emailSummary?: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  scope?: "day" | "minute" | "unknown";
  retryAfterSeconds?: number;
}

export class ApiError extends Error {
  status: number;
  retryAfterSeconds?: number;

  constructor(
    message: string,
    status: number,
    retryAfterSeconds?: number
  ) {
    super(message);
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

function handleAxiosError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<ApiEnvelope<unknown>>;

    throw new ApiError(
      err.response?.data?.message ||
        err.message ||
        "Something went wrong",
      err.response?.status ?? 500,
      err.response?.data?.retryAfterSeconds
    );
  }

  throw new ApiError("Unexpected error occurred", 500);
}

export async function fetchMeetings(): Promise<Meeting[]> {
  try {
    const { data } = await api.get<{
      success: boolean;
      meetings: Meeting[];
      message?: string;
    }>("/meetings");

    if (!data.success) {
      throw new ApiError(data.message || "Failed to fetch meetings", 400);
    }

    return data.meetings;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function uploadMeetingRecording(
  file: File
): Promise<Meeting> {
  try {
    const formData = new FormData();
    formData.append("audio", file);

    const { data } = await api.post<{
      success: boolean;
      meeting: Meeting;
      message?: string;
    }>("/meetings/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (!data.success) {
      throw new ApiError(data.message || "Upload failed", 400);
    }

    return data.meeting;
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function createJiraTicketsForMeeting(
  meetingId: string
): Promise<{
  tickets: JiraTicket[];
  jiraLive: boolean;
  meeting: Meeting;
}> {
  try {
    const { data } = await api.post<{
      success: boolean;
      tickets: JiraTicket[];
      jiraLive: boolean;
      meeting: Meeting;
      message?: string;
    }>(`/meetings/${meetingId}/jira`);

    if (!data.success) {
      throw new ApiError(
        data.message || "Failed to create Jira tickets",
        400
      );
    }

    return {
      tickets: data.tickets,
      jiraLive: data.jiraLive,
      meeting: data.meeting,
    };
  } catch (error) {
    handleAxiosError(error);
  }
}

export async function emailMeetingSummary(
  meetingId: string
): Promise<{
  emailSummary: string;
  delivered: boolean;
  meeting: Meeting;
}> {
  try {
    const { data } = await api.post<{
      success: boolean;
      emailSummary: string;
      delivered: boolean;
      meeting: Meeting;
      message?: string;
    }>(`/meetings/${meetingId}/email`);

    if (!data.success) {
      throw new ApiError(
        data.message || "Failed to send email",
        400
      );
    }

    return {
      emailSummary: data.emailSummary,
      delivered: data.delivered,
      meeting: data.meeting,
    };
  } catch (error) {
    handleAxiosError(error);
  }
}