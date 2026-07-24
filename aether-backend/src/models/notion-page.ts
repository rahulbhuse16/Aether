import mongoose, { Schema, Document } from "mongoose";

export interface INotionPage extends Document {
  userId: mongoose.Types.ObjectId;
  notionPageId: string;
  workspaceId: string;
  title: string;
  url: string;
  icon?: string | null;
  content?: string;
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
    lastEditedTime: { type: Date },
    archived: { type: Boolean, default: false },
    syncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Prevents duplicate synced pages per the spec: userId + notionPageId is unique.
NotionPageSchema.index({ userId: 1, notionPageId: 1 }, { unique: true });

// Cheap title search without needing a full-text index migration yet.
NotionPageSchema.index({ userId: 1, title: 1 });

export const NotionPage = mongoose.model<INotionPage>("NotionPage", NotionPageSchema);