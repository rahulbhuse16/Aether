import mongoose, { Schema, Document } from "mongoose";

export type TaskStatus = "open" | "in_progress" | "done";
export type TaskSource = "github" | "jira" | "ai";
export type TaskPriority = "high" | "medium" | "low";

// Shape sent to / received from the frontend. Keep this 1:1 with
// frontend/src/store/types.ts -> Task
export interface ITask extends Document {
  id: string;              // stable client-facing id, e.g. "t-171..." or "gh-123"
  title: string;
  status: TaskStatus;
  source: TaskSource;
  priority?: TaskPriority;
  dueDate?: string;
  user: mongoose.Types.ObjectId;
  githubIssueNumber?: number; // present only when source === "github"
  githubIssueUrl?: string;
  githubIssueId ?: string;
  project : mongoose.Types.ObjectId;
  
}

const TaskSchema = new Schema<ITask>(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    status: { type: String, enum: ["open", "in_progress", "done"], default: "open" },
    source: { type: String, enum: ["github", "jira", "ai"], required: true },
    priority: { type: String, enum: ["high", "medium", "low"] },
    dueDate: { type: String },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    githubIssueNumber: { type: Number },
    githubIssueUrl: { type: String },
    githubIssueId: { type: String },
    project:{type : Schema.Types.ObjectId, ref: "Project", required: true }

  },
  { timestamps: true }
);

// Serialize exactly the fields the frontend Task type expects
TaskSchema.methods.toJSON = function () {
  const { id, title, status, source, priority, dueDate, githubIssueNumber, githubIssueUrl } = this;
  return { id, title, status, source, priority, dueDate, githubIssueNumber, githubIssueUrl };
};

export const Task= mongoose.model<ITask>("Task", TaskSchema);