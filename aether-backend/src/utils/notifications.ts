import Notification, {
  NotificationPriority,
  NotificationType,
} from "../models/notification";
import { sendSseEvent } from "../services/sse";

export interface IPayload {
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  description: string;
  href?: string;
  metadata?: Record<string, any>;
}

export const saveNotification = async (
  payload: IPayload
) => {
  const {
    userId,
    type,
    priority,
    title,
    description,
    href,
    metadata,
  } = payload;

  /**
   * Prevent duplicate USAGE notifications
   * Only allow one usage notification per user per day.
   */
  if (type === NotificationType.USAGE) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const alreadyExists = await Notification.findOne({
      userId,
      type,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (alreadyExists) {
      return alreadyExists;
    }
  }

  /**
   * Save notification
   */
  const notification = await Notification.create({
    userId,
    type,
    priority,
    title,
    description,
    href,
    metadata,
    read: false,
  });

  /**
   * Send real-time notification
   */
  sendSseEvent(userId, "notification", notification);

  return notification;
};






export const buildGithubNotification = (
  event: string,
  action: string,
  payload: any,
) => {
  const repo = payload.repository;
  const issue = payload.issue;
  const pullRequest = payload.pull_request;
  const comment = payload.comment;
  const sender = payload.sender;

  const actor = sender?.login ?? "Someone";

  const baseMetadata = {
    event,
    action,
    repositoryId: repo?.id,
    repositoryName: repo?.full_name,
    repositoryUrl: repo?.html_url,
    sender: sender?.login,
    senderAvatar: sender?.avatar_url,
  };

  // -------------------------
  // ISSUES
  // -------------------------
  if (event === "issues" && issue) {
    const issueUrl = issue.html_url;

    switch (action) {
      case "opened":
        return {
          type: NotificationType.GITHUB,
          priority: NotificationPriority.MEDIUM,
          title: "New GitHub issue",
          description: `${actor} opened issue #${issue.number}: ${issue.title}`,
          source: "github",
          href: issueUrl,
          icon: "circle-alert",
          metadata: {
            ...baseMetadata,
            issueNumber: issue.number,
            issueId: issue.id,
            issueTitle: issue.title,
          },
        };

      case "closed":
        return {
          type: NotificationType.GITHUB,
          priority: NotificationPriority.MEDIUM,
          title: "GitHub issue closed",
          description: `${actor} closed issue #${issue.number}: ${issue.title}`,
          source: "github",
          href: issueUrl,
          icon: "circle-check",
          metadata: {
            ...baseMetadata,
            issueNumber: issue.number,
            issueId: issue.id,
          },
        };

      case "reopened":
        return {
          type: NotificationType.GITHUB,
          priority: NotificationPriority.HIGH,
          title: "GitHub issue reopened",
          description: `${actor} reopened issue #${issue.number}: ${issue.title}`,
          source: "github",
          href: issueUrl,
          icon: "rotate-ccw",
          metadata: {
            ...baseMetadata,
            issueNumber: issue.number,
            issueId: issue.id,
          },
        };

      case "assigned":
        return {
          type: NotificationType.GITHUB,
          priority: NotificationPriority.MEDIUM,
          title: "Issue assigned",
          description: `${actor} assigned issue #${issue.number}: ${issue.title}`,
          source: "github",
          href: issueUrl,
          icon: "user-plus",
          metadata: {
            ...baseMetadata,
            issueNumber: issue.number,
            issueId: issue.id,
          },
        };

      case "labeled":
        return {
          type: NotificationType.GITHUB,
          priority: NotificationPriority.LOW,
          title: "Issue label updated",
          description: `${actor} added a label to issue #${issue.number}: ${issue.title}`,
          source: "github",
          href: issueUrl,
          icon: "tag",
          metadata: {
            ...baseMetadata,
            issueNumber: issue.number,
            issueId: issue.id,
            label: payload.label?.name,
          },
        };
    }
  }

  // -------------------------
  // PULL REQUESTS
  // -------------------------
  if (event === "pull_request" && pullRequest) {
    const prUrl = pullRequest.html_url;

    switch (action) {
      case "opened":
        return {
          type: NotificationType.GITHUB,
          priority: NotificationPriority.HIGH,
          title: "New pull request",
          description: `${actor} opened PR #${pullRequest.number}: ${pullRequest.title}`,
          source: "github",
          href: prUrl,
          icon: "git-pull-request",
          metadata: {
            ...baseMetadata,
            pullRequestNumber: pullRequest.number,
            pullRequestId: pullRequest.id,
          },
        };

      case "closed":
        return {
          type: NotificationType.GITHUB,
          priority: NotificationPriority.MEDIUM,
          title: "Pull request closed",
          description: `${actor} closed PR #${pullRequest.number}: ${pullRequest.title}`,
          source: "github",
          href: prUrl,
          icon: "git-pull-request-closed",
          metadata: {
            ...baseMetadata,
            pullRequestNumber: pullRequest.number,
            pullRequestId: pullRequest.id,
            merged: pullRequest.merged,
          },
        };

      case "reopened":
        return {
          type: NotificationType.GITHUB,
          priority: NotificationPriority.HIGH,
          title: "Pull request reopened",
          description: `${actor} reopened PR #${pullRequest.number}: ${pullRequest.title}`,
          source: "github",
          href: prUrl,
          icon: "rotate-ccw",
          metadata: {
            ...baseMetadata,
            pullRequestNumber: pullRequest.number,
            pullRequestId: pullRequest.id,
          },
        };

      case "synchronize":
        return {
          type: NotificationType.GITHUB,
          priority: NotificationPriority.LOW,
          title: "Pull request updated",
          description: `${actor} pushed new commits to PR #${pullRequest.number}: ${pullRequest.title}`,
          source: "github",
          href: prUrl,
          icon: "git-commit-horizontal",
          metadata: {
            ...baseMetadata,
            pullRequestNumber: pullRequest.number,
            pullRequestId: pullRequest.id,
          },
        };
    }
  }

  // -------------------------
  // ISSUE COMMENTS
  // -------------------------
  if (event === "issue_comment" && comment) {
    const issueUrl =
      issue?.html_url ??
      pullRequest?.html_url ??
      repo?.html_url;

    return {
      type: NotificationType.GITHUB,
      priority: NotificationPriority.MEDIUM,
      title: "New GitHub comment",
      description: `${actor} commented on ${issue ? "issue" : "pull request"} #${
        issue?.number
      }`,
      source: "github",
      href: issueUrl,
      icon: "message-circle",
      metadata: {
        ...baseMetadata,
        issueNumber: issue?.number,
        commentId: comment.id,
        commentBody: comment.body,
      },
    };
  }

  // -------------------------
  // PUSH
  // -------------------------
  if (event === "push") {
    const commitCount = payload.commits?.length ?? 0;

    return {
      type: NotificationType.GITHUB,
      priority: NotificationPriority.LOW,
      title: "New commits pushed",
      description: `${actor} pushed ${commitCount} commit${
        commitCount !== 1 ? "s" : ""
      } to ${payload.ref?.replace("refs/heads/", "")}`,
      source: "github",
      href: repo?.html_url,
      icon: "git-branch",
      metadata: {
        ...baseMetadata,
        branch: payload.ref,
        commitCount,
        before: payload.before,
        after: payload.after,
      },
    };
  }

  // -------------------------
  // RELEASE
  // -------------------------
  if (event === "release") {
    const release = payload.release;

    return {
      type: NotificationType.GITHUB,
      priority: NotificationPriority.HIGH,
      title: "New GitHub release",
      description: `${actor} ${action} release ${release?.tag_name}`,
      source: "github",
      href: release?.html_url,
      icon: "package",
      metadata: {
        ...baseMetadata,
        releaseId: release?.id,
        tagName: release?.tag_name,
      },
    };
  }

  // -------------------------
  // WORKFLOW RUN
  // -------------------------
  if (event === "workflow_run") {
    const workflow = payload.workflow_run;

    const priority =
      workflow?.conclusion === "failure"
        ? NotificationPriority.CRITICAL
        : NotificationPriority.MEDIUM;

    return {
      type: NotificationType.GITHUB,
      priority,
      title:
        workflow?.conclusion === "failure"
          ? "GitHub Actions failed"
          : "GitHub Actions workflow updated",
      description: `${workflow?.name} ${workflow?.conclusion ?? action}`,
      source: "github",
      href: workflow?.html_url,
      icon:
        workflow?.conclusion === "failure"
          ? "circle-x"
          : "workflow",
      metadata: {
        ...baseMetadata,
        workflowId: workflow?.id,
        workflowName: workflow?.name,
        conclusion: workflow?.conclusion,
      },
    };
  }



  return null;
};