import mongoose from "mongoose";
import { Project } from "../models/project";
import {
  Incident,
  IIncident,
  IIncidentTimelineEntry,
  IRelatedCommit,
  IncidentSeverity,
  IncidentStatus,
  INCIDENT_SEVERITY_VALUES,
  INCIDENT_STATUS_VALUES,
} from "../models/incident";
import {
  groqService,
  IncidentAnalysisContext,
  IncidentAnalysisResult,
  IncidentAnalysisTimelineHint,
} from "./groq";
import { GROQ_MODEL } from "../config/groq";

const GROQ_MODEL_NAME = GROQ_MODEL;

export function isValidIncidentStatus(value: unknown): value is IncidentStatus {
  return typeof value === "string" && INCIDENT_STATUS_VALUES.includes(value as IncidentStatus);
}

export function isValidIncidentSeverity(value: unknown): value is IncidentSeverity {
  return typeof value === "string" && INCIDENT_SEVERITY_VALUES.includes(value as IncidentSeverity);
}

export async function loadOwnedProject(
  projectId: mongoose.Types.ObjectId | string,
  userId: string
) {
  return Project.findOne({ _id: projectId, owner: userId });
}

function parseTimelineInput(raw: unknown): IIncidentTimelineEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: IIncidentTimelineEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const summary = typeof (item as { summary?: unknown }).summary === "string"
      ? (item as { summary: string }).summary.trim()
      : "";
    if (!summary) continue;
    const atRaw = (item as { at?: unknown }).at;
    const at =
      typeof atRaw === "string" || atRaw instanceof Date
        ? new Date(atRaw)
        : new Date();
    if (Number.isNaN(at.getTime())) continue;
    const source =
      typeof (item as { source?: unknown }).source === "string"
        ? (item as { source: string }).source
        : undefined;
    entries.push({ at, summary, source });
  }
  return entries;
}

function parseRelatedCommits(raw: unknown): IRelatedCommit[] {
  if (!Array.isArray(raw)) return [];
  const commits: IRelatedCommit[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const sha = typeof (item as { sha?: unknown }).sha === "string"
      ? (item as { sha: string }).sha.trim()
      : "";
    const message = typeof (item as { message?: unknown }).message === "string"
      ? (item as { message: string }).message.trim()
      : "";
    if (!sha || !message) continue;
    commits.push({
      sha,
      message,
      author:
        typeof (item as { author?: unknown }).author === "string"
          ? (item as { author: string }).author
          : undefined,
      url:
        typeof (item as { url?: unknown }).url === "string"
          ? (item as { url: string }).url
          : undefined,
    });
  }
  return commits;
}

function stringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

export function validateIncidentAnalysis(raw: unknown): IncidentAnalysisResult | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const rootCause = typeof o.rootCause === "string" ? o.rootCause.trim() : "";
  if (!rootCause) return null;

  const confidence =
    typeof o.confidence === "number" && !Number.isNaN(o.confidence)
      ? Math.min(100, Math.max(0, o.confidence))
      : null;
  if (confidence === null) return null;

  if (!Array.isArray(o.evidence) || !o.evidence.every((e) => typeof e === "string")) {
    return null;
  }
  if (
    !Array.isArray(o.affectedComponents) ||
    !o.affectedComponents.every((e) => typeof e === "string")
  ) {
    return null;
  }
  if (
    !Array.isArray(o.recommendedActions) ||
    !o.recommendedActions.every((e) => typeof e === "string")
  ) {
    return null;
  }
  if (!isValidIncidentSeverity(o.severity)) return null;

  if (!Array.isArray(o.timeline)) return null;
  const timeline: IncidentAnalysisTimelineHint[] = [];
  for (const entry of o.timeline) {
    if (!entry || typeof entry !== "object") return null;
    const summary =
      typeof (entry as { summary?: unknown }).summary === "string"
        ? (entry as { summary: string }).summary.trim()
        : "";
    if (!summary) return null;
    const hint: IncidentAnalysisTimelineHint = { summary };
    const at = (entry as { at?: unknown }).at;
    if (typeof at === "string" && at.trim()) hint.at = at.trim();
    const source = (entry as { source?: unknown }).source;
    if (typeof source === "string" && source.trim()) hint.source = source.trim();
    timeline.push(hint);
  }

  return {
    rootCause,
    confidence,
    evidence: o.evidence as string[],
    affectedComponents: o.affectedComponents as string[],
    timeline,
    recommendedActions: o.recommendedActions as string[],
    severity: o.severity as IncidentSeverity,
  };
}

function aiTimelineToStored(hints: IncidentAnalysisTimelineHint[]): IIncidentTimelineEntry[] {
  return hints.map((h) => {
    let at = new Date();
    if (h.at) {
      const parsed = new Date(h.at);
      if (!Number.isNaN(parsed.getTime())) at = parsed;
    }
    return { at, summary: h.summary, source: h.source || "ai" };
  });
}

export function serializeIncident(doc: IIncident) {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId.toString(),
    title: doc.title,
    description: doc.description,
    status: doc.status,
    severity: doc.severity,
    startedAt: doc.startedAt,
    resolvedAt: doc.resolvedAt,
    timeline: doc.timeline,
    relatedEvents: doc.relatedEvents,
    relatedCommits: doc.relatedCommits,
    suspectedRootCause: doc.suspectedRootCause,
    rootCauseConfidence: doc.rootCauseConfidence,
    recommendedActions: doc.recommendedActions,
    aiAnalysis: doc.aiAnalysis,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface CreateIncidentInput {
  projectId: string;
  title: string;
  description?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  startedAt?: string | Date;
  timeline?: unknown;
  relatedEvents?: unknown;
  relatedCommits?: unknown;
}

export async function createIncidentForProject(
  userId: string,
  input: CreateIncidentInput
): Promise<IIncident> {
  const project = await loadOwnedProject(input.projectId, userId);
  if (!project) {
    throw Object.assign(new Error("Project not found for this user"), { statusCode: 404 });
  }

  let startedAt = new Date();
  if (input.startedAt) {
    const parsed = new Date(input.startedAt);
    if (!Number.isNaN(parsed.getTime())) startedAt = parsed;
  }

  const status = input.status ?? "investigating";
  const resolvedAt = status === "resolved" ? new Date() : undefined;

  return Incident.create({
    projectId: project._id,
    title: input.title.trim(),
    description: typeof input.description === "string" ? input.description : "",
    severity: input.severity ?? "medium",
    status,
    startedAt,
    resolvedAt,
    timeline: parseTimelineInput(input.timeline),
    relatedEvents: stringArray(input.relatedEvents),
    relatedCommits: parseRelatedCommits(input.relatedCommits),
  });
}

export async function listIncidentsForProject(userId: string, projectId: string) {
  const project = await loadOwnedProject(projectId, userId);
  if (!project) {
    throw Object.assign(new Error("Project not found for this user"), { statusCode: 404 });
  }

  return Incident.find({ projectId: project._id }).sort({ createdAt: -1 });
}

export async function getIncidentById(userId: string, incidentId: string) {
  if (!mongoose.Types.ObjectId.isValid(incidentId)) {
    throw Object.assign(new Error("Invalid incident id"), { statusCode: 400 });
  }

  const incident = await Incident.findById(incidentId);
  if (!incident) {
    throw Object.assign(new Error("Incident not found"), { statusCode: 404 });
  }

  const project = await loadOwnedProject(incident.projectId, userId);
  if (!project) {
    throw Object.assign(new Error("Incident not found"), { statusCode: 404 });
  }

  return incident;
}

export async function updateIncidentStatusSeverity(
  userId: string,
  incidentId: string,
  updates: { status?: IncidentStatus; severity?: IncidentSeverity }
) {
  const incident = await getIncidentById(userId, incidentId);

  if (updates.status !== undefined) {
    incident.status = updates.status;
    if (updates.status === "resolved" && !incident.resolvedAt) {
      incident.resolvedAt = new Date();
    }
    if (updates.status !== "resolved") {
      incident.resolvedAt = undefined;
    }
  }

  if (updates.severity !== undefined) {
    incident.severity = updates.severity;
  }

  await incident.save();
  return incident;
}

export interface AnalyzeIncidentOverrides {
  errorDescription?: string;
  recentCommits?: unknown;
  deploymentsOrEvents?: unknown;
  affectedServicesOrFiles?: unknown;
  timeline?: unknown;
}

export async function analyzeIncidentWithAi(
  userId: string,
  incidentId: string,
  overrides: AnalyzeIncidentOverrides = {}
) {
  const incident = await getIncidentById(userId, incidentId);
  const project = await Project.findById(incident.projectId);
  if (!project) {
    throw Object.assign(new Error("Project not found"), { statusCode: 404 });
  }

  const overrideCommits = parseRelatedCommits(overrides.recentCommits);
  const overrideEvents = stringArray(overrides.deploymentsOrEvents);
  const overrideTimeline = parseTimelineInput(overrides.timeline);
  const overrideFiles = stringArray(overrides.affectedServicesOrFiles);

  const context: IncidentAnalysisContext = {
    title: incident.title,
    description: incident.description,
    errorDescription:
      typeof overrides.errorDescription === "string"
        ? overrides.errorDescription
        : incident.description,
    recentCommits:
      overrideCommits.length > 0 ? overrideCommits : incident.relatedCommits,
    deploymentsOrEvents:
      overrideEvents.length > 0 ? overrideEvents : incident.relatedEvents,
    affectedServicesOrFiles: overrideFiles,
    timeline:
      overrideTimeline.length > 0
        ? overrideTimeline.map((t) => ({
            at: t.at.toISOString(),
            summary: t.summary,
            source: t.source,
          }))
        : incident.timeline.map((t) => ({
            at: t.at.toISOString(),
            summary: t.summary,
            source: t.source,
          })),
    project: {
      repoName: project.repo || project.name || "unknown",
      description: project.description,
      stack: project.stack || [],
    },
  };

  const raw = await groqService.analyzeIncident(context);
  const validated = validateIncidentAnalysis(raw);
  if (!validated) {
    throw Object.assign(new Error("AI response failed validation"), { statusCode: 502 });
  }

  const storedTimeline = aiTimelineToStored(validated.timeline);

  incident.suspectedRootCause = validated.rootCause;
  incident.rootCauseConfidence = validated.confidence;
  incident.recommendedActions = validated.recommendedActions;
  incident.aiAnalysis = {
    ...validated,
    timeline: storedTimeline,
    analyzedAt: new Date(),
    model: GROQ_MODEL_NAME,
  };

  if (incident.status === "investigating") {
    incident.status = "identified";
  }

  await incident.save();
  return incident;
}
