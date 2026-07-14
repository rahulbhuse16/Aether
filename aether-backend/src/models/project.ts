import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema(
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

export const Project= mongoose.model("Project", ProjectSchema);