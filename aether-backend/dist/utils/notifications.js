"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGithubNotification = exports.saveNotification = void 0;
const notification_1 = __importStar(require("../models/notification"));
const sse_1 = require("../services/sse");
// =====================================================
// SAVE NOTIFICATION
// =====================================================
const saveNotification = async (payload) => {
    try {
        const { userId, type, priority, title, description, href, metadata, } = payload;
        // =================================================
        // PREVENT DUPLICATE USAGE NOTIFICATIONS
        // =================================================
        if (type === notification_1.NotificationType.USAGE) {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
            const alreadyExists = await notification_1.default.findOne({
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
        // =================================================
        // CREATE NOTIFICATION
        // =================================================
        const notification = await notification_1.default.create({
            userId,
            type,
            priority: priority ??
                notification_1.NotificationPriority.MEDIUM,
            title,
            description,
            href,
            metadata,
            read: false,
        });
        // =================================================
        // SEND REAL-TIME SSE EVENT
        // =================================================
        (0, sse_1.sendSseEvent)(userId, "notification", notification);
        return notification;
    }
    catch (error) {
        // =================================================
        // MONGOOSE VALIDATION ERROR
        // =================================================
        if (error?.name ===
            "ValidationError") {
            console.error("Notification validation error:", error.errors);
        }
        // =================================================
        // DUPLICATE KEY ERROR
        // =================================================
        else if (error?.code === 11000) {
            console.error("Duplicate notification error:", error);
        }
        // =================================================
        // GENERAL ERROR
        // =================================================
        else {
            console.error("Failed to save notification:", error);
        }
        // Do not crash the webhook or main process
        return null;
    }
};
exports.saveNotification = saveNotification;
const buildGithubNotification = (event, action, payload) => {
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
                    type: notification_1.NotificationType.GITHUB,
                    priority: notification_1.NotificationPriority.MEDIUM,
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
                    type: notification_1.NotificationType.GITHUB,
                    priority: notification_1.NotificationPriority.MEDIUM,
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
                    type: notification_1.NotificationType.GITHUB,
                    priority: notification_1.NotificationPriority.HIGH,
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
                    type: notification_1.NotificationType.GITHUB,
                    priority: notification_1.NotificationPriority.MEDIUM,
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
                    type: notification_1.NotificationType.GITHUB,
                    priority: notification_1.NotificationPriority.LOW,
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
                    type: notification_1.NotificationType.GITHUB,
                    priority: notification_1.NotificationPriority.HIGH,
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
                    type: notification_1.NotificationType.GITHUB,
                    priority: notification_1.NotificationPriority.MEDIUM,
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
                    type: notification_1.NotificationType.GITHUB,
                    priority: notification_1.NotificationPriority.HIGH,
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
                    type: notification_1.NotificationType.GITHUB,
                    priority: notification_1.NotificationPriority.LOW,
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
        const issueUrl = issue?.html_url ??
            pullRequest?.html_url ??
            repo?.html_url;
        return {
            type: notification_1.NotificationType.GITHUB,
            priority: notification_1.NotificationPriority.MEDIUM,
            title: "New GitHub comment",
            description: `${actor} commented on ${issue ? "issue" : "pull request"} #${issue?.number}`,
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
            type: notification_1.NotificationType.GITHUB,
            priority: notification_1.NotificationPriority.LOW,
            title: "New commits pushed",
            description: `${actor} pushed ${commitCount} commit${commitCount !== 1 ? "s" : ""} to ${payload.ref?.replace("refs/heads/", "")}`,
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
            type: notification_1.NotificationType.GITHUB,
            priority: notification_1.NotificationPriority.HIGH,
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
        const priority = workflow?.conclusion === "failure"
            ? notification_1.NotificationPriority.CRITICAL
            : notification_1.NotificationPriority.MEDIUM;
        return {
            type: notification_1.NotificationType.GITHUB,
            priority,
            title: workflow?.conclusion === "failure"
                ? "GitHub Actions failed"
                : "GitHub Actions workflow updated",
            description: `${workflow?.name} ${workflow?.conclusion ?? action}`,
            source: "github",
            href: workflow?.html_url,
            icon: workflow?.conclusion === "failure"
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
exports.buildGithubNotification = buildGithubNotification;
