import mongoose, { Schema, Document, Model } from "mongoose";

export interface GeneratedFile {
  path: string;
  language: string;
  content: string;
}

export interface VoiceCommandDoc extends Document {
  userId?: string;
  transcript: string;
  status: "pending" | "building" | "complete";
  output?: string;
  generatedFiles?: GeneratedFile[];
  createdAt: Date;
  updatedAt: Date;
}

const GeneratedFileSchema = new Schema<GeneratedFile>(
  {
    path: { type: String, required: true },
    language: { type: String, required: true },
    content: { type: String, required: true },
  },
  { _id: false }
);

const VoiceCommandSchema = new Schema<VoiceCommandDoc>(
  {
    userId: { type: String, index: true },
    transcript: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["pending", "building", "complete"],
      default: "pending",
    },
    output: { type: String },
    generatedFiles: [GeneratedFileSchema],
  },
  { timestamps: true }
);

export const VoiceCommand: Model<VoiceCommandDoc> =
  mongoose.models.VoiceCommand ||
  mongoose.model<VoiceCommandDoc>("VoiceCommand", VoiceCommandSchema);