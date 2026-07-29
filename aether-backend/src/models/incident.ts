import mongoose, { Schema, Document, Types } from "mongoose";

export type IncidentStatus = "investigating" | "identified" | "resolved";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export const INCIDENT_STATUS_VALUES: IncidentStatus[] = [
  "investigating",
  "identified",
  "resolved",
];

export const INCIDENT_SEVERITY_VALUES: IncidentSeverity[] = [
  "low",
  "medium",
  "high",
  "critical",
];

export interface IIncidentTimelineEntry {
  at: Date;
  summary: string;
  source?: string;
}

export interface IRelatedCommit {
  sha: string;
  message: string;
  author?: string;
  url?: string;
}

export interface IIncidentAiAnalysis {
  rootCause: string;
  confidence: number;
  evidence: string[];
  affectedComponents: string[];
  timeline: IIncidentTimelineEntry[];
  recommendedActions: string[];
  severity: IncidentSeverity;
  analyzedAt?: Date;
  model?: string;
}

//@ts-ignore
export interface IIncident extends Document {
  projectId: Types.ObjectId;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  startedAt: Date;
  resolvedAt?: Date;
  timeline: IIncidentTimelineEntry[];
  relatedEvents: string[];
  relatedCommits: IRelatedCommit[];
  suspectedRootCause?: string;
  rootCauseConfidence?: number;
  recommendedActions: string[];
  aiAnalysis?: IIncidentAiAnalysis;
  createdAt: Date;
  updatedAt: Date;
}

const IncidentTimelineEntrySchema = new Schema<IIncidentTimelineEntry>(
  {
    at: { type: Date, required: true },
    summary: { type: String, required: true },
    source: { type: String, default: "" },
  },
  { _id: false }
);

const RelatedCommitSchema = new Schema<IRelatedCommit>(
  {
    sha: { type: String, required: true },
    message: { type: String, required: true },
    author: { type: String, default: "" },
    url: { type: String, default: "" },
  },
  { _id: false }
);

const IncidentAiAnalysisSchema = new Schema<IIncidentAiAnalysis>(
  {
    rootCause: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0, max: 100 },
    evidence: { type: [String], default: [] },
    affectedComponents: { type: [String], default: [] },
    timeline: { type: [IncidentTimelineEntrySchema], default: [] },
    recommendedActions: { type: [String], default: [] },
    severity: {
      type: String,
      enum: INCIDENT_SEVERITY_VALUES,
      required: true,
    },
    analyzedAt: { type: Date },
    model: { type: String, default: "" },
  },
  { _id: false }
);

const IncidentSchema = new Schema<IIncident>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, default: "" },
    status: {
      type: String,
      enum: INCIDENT_STATUS_VALUES,
      default: "investigating",
    },
    severity: {
      type: String,
      enum: INCIDENT_SEVERITY_VALUES,
      default: "medium",
    },
    startedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
    timeline: { type: [IncidentTimelineEntrySchema], default: [] },
    relatedEvents: { type: [String], default: [] },
    relatedCommits: { type: [RelatedCommitSchema], default: [] },
    suspectedRootCause: { type: String, default: "" },
    rootCauseConfidence: { type: Number, min: 0, max: 100 },
    recommendedActions: { type: [String], default: [] },
    aiAnalysis: { type: IncidentAiAnalysisSchema },
  },
  { timestamps: true }
);

IncidentSchema.index({ projectId: 1, createdAt: -1 });

export const Incident = mongoose.model<IIncident>("Incident", IncidentSchema);
