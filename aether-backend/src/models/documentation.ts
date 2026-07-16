import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type GeneratedDocType = "readme" | "api" | "architecture" | "flow";

export interface IGeneratedDoc {
  id: string;
  title: string;
  type: GeneratedDocType;
  status: "ready" | "error";
  preview: string;
  content: string;
}

const GeneratedDocSchema = new Schema<IGeneratedDoc>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, required: true, enum: ["readme", "api", "architecture", "flow"] },
    status: { type: String, required: true, enum: ["ready", "error"], default: "ready" },
    preview: { type: String, required: true },
    content: { type: String, required: true },
  },
  { _id: false }
);
//@ts-ignore

export interface IDocsSession extends Document {
  user: Types.ObjectId;
  repoId: string;
  owner: string;
  repoName: string;
  branch: string;
  documents: IGeneratedDoc[];
  model: string;
  status: "completed" | "failed";
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DocsSessionSchema = new Schema<IDocsSession>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    repoId: { type: String, required: true },
    owner: { type: String, required: true },
    repoName: { type: String, required: true },
    branch: { type: String, required: true },
    documents: { type: [GeneratedDocSchema], default: [] },
    model: { type: String, default: "" },
    status: { type: String, enum: ["completed", "failed"], default: "completed" },
    errorMessage: { type: String, default: "" },
  },
  { timestamps: true }
);

// One live doc set per user+repo — regenerating replaces it rather than growing a history list.
DocsSessionSchema.index({ user: 1, repoId: 1 }, { unique: true });

export const DocsSession: Model<IDocsSession> =
  mongoose.models.DocsSession || mongoose.model<IDocsSession>("DocsSession", DocsSessionSchema);