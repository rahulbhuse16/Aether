import mongoose, { Schema, Document, Types } from "mongoose";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface IBugFinding {
  title: string;
  severity: Severity;
  confidence: number;
  category: string;
  file: string;
  lineStart: number;
  lineEnd: number;
  description: string;
  rootCause: string;
  impact: string;
  fix: string;
  codeSnippet: string;
  relatedFiles: string[];
}
//@ts-ignore
export interface IBugAnalysis extends Document {
  user: Types.ObjectId;
  repoUrl: string;
  repoName: string;
  owner: string;
  branch: string;
  focusPath?: string;
  stackTraceContext?: string;
  repositoryHealthScore: number;
  summary: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  findings: IBugFinding[];
  filesAnalyzed: number;
  filesSkipped: number;
  model: string;
  status: "completed" | "failed";
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BugFindingSchema = new Schema<IBugFinding>(
  {
    title: { type: String, required: true },
    severity: {
      type: String,
      enum: ["critical", "high", "medium", "low", "info"],
      required: true,
    },
    confidence: { type: Number, required: true, min: 0, max: 100 },
    category: { type: String, required: true },
    file: { type: String, required: true },
    lineStart: { type: Number, default: 0 },
    lineEnd: { type: Number, default: 0 },
    description: { type: String, required: true },
    rootCause: { type: String, required: true },
    impact: { type: String, required: true },
    fix: { type: String, required: true },
    codeSnippet: { type: String, default: "" },
    relatedFiles: { type: [String], default: [] },
  },
  { _id: true }
);

const BugAnalysisSchema = new Schema<IBugAnalysis>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    repoUrl: { type: String, required: true },
    repoName: { type: String, required: true },
    owner: { type: String, required: true },
    branch: { type: String, required: true, default: "main" },
    focusPath: { type: String, default: "" },
    stackTraceContext: { type: String, default: "" },

    repositoryHealthScore: { type: Number, required: true, min: 0, max: 100 },
    summary: { type: String, required: true },

    critical: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    low: { type: Number, default: 0 },

    findings: { type: [BugFindingSchema], default: [] },

    filesAnalyzed: { type: Number, default: 0 },
    filesSkipped: { type: Number, default: 0 },
    model: { type: String, default: "" },

    status: {
      type: String,
      enum: ["completed", "failed"],
      default: "completed",
    },
    errorMessage: { type: String, default: "" },
  },
  { timestamps: true }
);

BugAnalysisSchema.index({ user: 1, createdAt: -1 });

export const BugAnalysis = mongoose.model<IBugAnalysis>(
  "BugAnalysis",
  BugAnalysisSchema
);