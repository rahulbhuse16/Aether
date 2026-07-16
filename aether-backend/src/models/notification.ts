import { Schema, model, Types } from "mongoose";

export enum NotificationType {
  AI = "ai",
  GITHUB = "github",
  JIRA = "jira",
  REPOSITORY = "repository",
  DEPLOYMENT = "deployment",
  SECURITY = "security",
  USAGE = "usage",
  BILLING = "billing",
  AGENT = "agent",
  SYSTEM = "system",
}

export enum NotificationPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

const NotificationSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },

    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      default: NotificationPriority.MEDIUM,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    read: {
      type: Boolean,
      default: false,
      index: true,
    },

    source: {
      type: String,
      enum: [
        "github",
        "groq",
        "jira",
        "repository",
        "deployment",
        "agent",
        "system",
      ],
      required: true,
    },

    href: {
      type: String,
    },

    icon: {
      type: String,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    createdAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default model("Notification", NotificationSchema);