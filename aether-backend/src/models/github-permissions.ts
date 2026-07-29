import { Schema, model, Types } from "mongoose";

const GitHubPermissionsSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    repoAccess: {
      type: [String],
      default: [],
    },
    webhookEnabled: {
      type: Boolean,
      default: false,
    },
    commitAnalysisEnabled: {
      type: Boolean,
      default: false,
    },
    prAnalysisEnabled: {
      type: Boolean,
      default: false,
    },
    lastSync: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default model("GitHubPermissions", GitHubPermissionsSchema);
