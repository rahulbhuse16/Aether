import api from "../api/api";
import { API_BASE } from "../constants/constants";

export type IncidentStatus = "investigating" | "identified" | "resolved";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export interface IncidentTimelineEntry {
  timestamp: string;
  description: string;
}

export interface IncidentAiAnalysis {
  rootCause: string;
  confidence: number;
  evidence: string[];
  affectedComponents: string[];
  timeline: IncidentTimelineEntry[];
  recommendedActions: string[];
  severity: IncidentSeverity;
  analyzedAt: string;
}

export interface Incident {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: IncidentStatus;
  severity: IncidentSeverity;
  startedAt: string;
  resolvedAt: string | null;
  timeline: IncidentTimelineEntry[];
  relatedEvents: string[];
  relatedCommits: string[];
  suspectedRootCause: string | null;
  rootCauseConfidence: number | null;
  recommendedActions: string[];
  aiAnalysis: IncidentAiAnalysis | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncidentInput {
  projectId: string;
  title: string;
  description?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  startedAt?: string;
  timeline?: IncidentTimelineEntry[];
  relatedEvents?: string[];
  relatedCommits?: string[];
}

export interface AnalyzeIncidentInput {
  errorDescription?: string;
  recentCommits?: string[];
  deploymentsOrEvents?: string[];
  affectedServicesOrFiles?: string[];
  timeline?: IncidentTimelineEntry[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
}

const incidentApi = api

export const incidentService = {
  create: async (userId: string, input: CreateIncidentInput): Promise<Incident> => {
    const { data } = await incidentApi.post<ApiEnvelope<Incident>>("/incidents", {
      userId,
      ...input,
    });
    return data.data as Incident;
  },

  getByProject: async (userId: string, projectId: string): Promise<Incident[]> => {
    const { data } = await incidentApi.get<ApiEnvelope<Incident[]>>(
      `/incidents/project/${projectId}`,
      { params: { userId } }
    );
    return data.data ?? [];
  },

  getById: async (userId: string, incidentId: string): Promise<Incident> => {
    const { data } = await incidentApi.get<ApiEnvelope<Incident>>(
      `/incidents/${incidentId}`,
      { params: { userId } }
    );
    return data.data as Incident;
  },

  updateStatusSeverity: async (
    userId: string,
    incidentId: string,
    updates: { status?: IncidentStatus; severity?: IncidentSeverity }
  ): Promise<Incident> => {
    const { data } = await incidentApi.patch<ApiEnvelope<Incident>>(
      `/incidents/${incidentId}`,
      { userId, ...updates }
    );
    return data.data as Incident;
  },

  analyze: async (
    userId: string,
    incidentId: string,
    input: AnalyzeIncidentInput
  ): Promise<Incident> => {
    const { data } = await incidentApi.post<ApiEnvelope<Incident>>(
      `/incidents/${incidentId}/analyze`,
      { userId, ...input }
    );
    return data.data as Incident;
  },
};