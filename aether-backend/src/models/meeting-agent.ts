import mongoose, { Schema, model, type Document, type Model } from "mongoose";

export type MeetingStatus = "processing" | "ready" | "failed";

export interface JiraTicket {
  id: string;
  key?: string;
  summary: string;
  description: string;
  priority: "Low" | "Medium" | "High";
  url?: string;
}

export interface IMeeting extends Document {
  title: string;
  date: string; // display string, e.g. "Jul 13, 2026"
  durationSeconds: number;
  duration: string; // display string, e.g. "18 min"
  status: MeetingStatus;
  summary: string;
  actionItems: string[];
  transcript: string;
  audioFileName?: string;
  failureReason?: string;
  ticketsCreated: boolean;
  tickets: JiraTicket[];
  emailSent: boolean;
  emailSummary?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JiraTicketSchema = new Schema<JiraTicket>(
  {
    id: { type: String, required: true },
    key: { type: String },
    summary: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
    url: { type: String },
  },
  { _id: false }
);

const MeetingSchema = new Schema<IMeeting>(
  {
    title: { type: String, required: true },
    date: { type: String, required: true },
    durationSeconds: { type: Number, default: 0 },
    duration: { type: String, required: true },
    status: { type: String, enum: ["processing", "ready", "failed"], default: "processing" },
    summary: { type: String, default: "" },
    actionItems: { type: [String], default: [] },
    transcript: { type: String, default: "" },
    audioFileName: { type: String },
    failureReason: { type: String },
    ticketsCreated: { type: Boolean, default: false },
    tickets: { type: [JiraTicketSchema], default: [] },
    emailSent: { type: Boolean, default: false },
    emailSummary: { type: String },
  },
  { timestamps: true }
);

export const MeetingModel: Model<IMeeting> =
  (mongoose.models.Meeting as Model<IMeeting>) || model<IMeeting>("Meeting", MeetingSchema, "meetings");