import mongoose, { Schema, Document } from "mongoose";

export type NotionPageType = "meeting_notes" | "adr" | "documentation" | "general";

export interface INotionPage extends Document {
  userId: mongoose.Types.ObjectId;
  notionPageId: string;
  workspaceId: string;
  title: string;
  url: string;
  icon?: string | null;
  content?: string;
  /**
   * Cheap heuristic classification (see utils/notion.ts classifyPageType) —
   * powers the meeting-notes action-item flow and light filtering without
   * an AI call on every synced page.
   */
  pageType: NotionPageType;
  lastEditedTime: Date;
  archived: boolean;
  syncedAt: Date;
}

const NotionPageSchema = new Schema<INotionPage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    notionPageId: { type: String, required: true },
    workspaceId: { type: String, required: true },
    title: { type: String, default: "Untitled" },
    url: { type: String, required: true },
    icon: { type: String, default: null },
    content: { type: String },
    pageType: {
      type: String,
      enum: ["meeting_notes", "adr", "documentation", "general"],
      default: "general",
    },
    lastEditedTime: { type: Date },
    archived: { type: Boolean, default: false },
    syncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Prevents duplicate synced pages per the spec: userId + notionPageId is unique.
NotionPageSchema.index({ userId: 1, notionPageId: 1 }, { unique: true });

// Content/title search — regex-based for now (see searchNotion / getRelevantNotionContext).
// A MongoDB $text index is a natural upgrade later if regex search becomes
// a bottleneck at scale: NotionPageSchema.index({ title: "text", content: "text" }).
NotionPageSchema.index({ userId: 1, title: 1 });
NotionPageSchema.index({ userId: 1, pageType: 1 });

export const NotionPage = mongoose.model<INotionPage>("NotionPage", NotionPageSchema);