import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type DeploymentArtifactType = "dockerfile" | "nginx" | "github-actions" | "kubernetes";

export interface IDeploymentArtifact {
  id: string;
  name: string;
  type: DeploymentArtifactType;
  content: string;
  language: string;
}

const DeploymentArtifactSchema = new Schema<IDeploymentArtifact>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["dockerfile", "nginx", "github-actions", "kubernetes"],
    },
    content: { type: String, required: true },
    language: { type: String, default: "" },
  },
  { _id: false }
);
//@ts-ignore

export interface IDeploymentSession extends Document {
  user: Types.ObjectId;
  repoId: string;
  owner: string;
  repoName: string;
  branch: string;
  connectedRepo: string; // "owner/repo" display string, matches frontend's `connectedRepo`
  artifacts: IDeploymentArtifact[];
  model: string;
  status: "completed" | "failed";
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeploymentSessionSchema = new Schema<IDeploymentSession>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    repoId: { type: String, required: true },
    owner: { type: String, required: true },
    repoName: { type: String, required: true },
    branch: { type: String, required: true },
    connectedRepo: { type: String, required: true },
    artifacts: { type: [DeploymentArtifactSchema], default: [] },
    model: { type: String, default: "" },
    status: { type: String, enum: ["completed", "failed"], default: "completed" },
    errorMessage: { type: String, default: "" },
  },
  { timestamps: true }
);

// One live session per user+repo — regenerating replaces it rather than growing a history list.
DeploymentSessionSchema.index({ user: 1, repoId: 1 }, { unique: true });

export const DeploymentSession: Model<IDeploymentSession> =
  mongoose.models.DeploymentSession ||
  mongoose.model<IDeploymentSession>("DeploymentSession", DeploymentSessionSchema);