import mongoose, { Document } from "mongoose";

export interface IProject extends Document {
  githubRepoId: number;
  owner: mongoose.Types.ObjectId;
  name?: string;
  repo: string; // "owner/repo" full_name — used to call the GitHub API
  openTasks: number;
  lastActivity?: string;
  githubUpdatedAt?: Date;
  description?: string;
  stack: string[];
  setupComplexity?: "low" | "medium" | "high";
  githubWebhookId?: number; // set once ensureWebhook() registers a hook for this repo
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new mongoose.Schema<IProject>(
  {
    githubRepoId: {
      type: Number,
      required: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: String,

    repo: String,

    openTasks: {
      type: Number,
      default: 0,
    },

    lastActivity: String,

    githubUpdatedAt: Date,

    // AI-generated on first index (see onboardingController.ts) — kept
    // optional/no-default so existing projects indexed before this field
    // existed just read back as undefined/empty rather than breaking.
    description: {
      type: String,
    },

    stack: {
      type: [String],
      default: [],
    },

    setupComplexity: {
      type: String,
      enum: ["low", "medium", "high"],
    },

    // Id of the webhook we registered on this repo via ensureWebhook().
    // Lets us check-before-create on reconnect and clean up on disconnect.
    githubWebhookId: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

ProjectSchema.index(
  {
    owner: 1,
    githubRepoId: 1,
  },
  {
    unique: true,
  }
);

// Non-unique: the webhook handler looks up "every project tracking this repo"
// by githubRepoId alone (across owners), separate from the per-owner uniqueness above.
ProjectSchema.index({ githubRepoId: 1 });

export const Project = mongoose.model<IProject>("Project", ProjectSchema);