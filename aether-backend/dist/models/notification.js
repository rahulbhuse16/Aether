"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationPriority = exports.NotificationType = void 0;
const mongoose_1 = require("mongoose");
var NotificationType;
(function (NotificationType) {
    NotificationType["AI"] = "ai";
    NotificationType["GITHUB"] = "github";
    NotificationType["JIRA"] = "jira";
    NotificationType["REPOSITORY"] = "repository";
    NotificationType["DEPLOYMENT"] = "deployment";
    NotificationType["SECURITY"] = "security";
    NotificationType["USAGE"] = "usage";
    NotificationType["BILLING"] = "billing";
    NotificationType["AGENT"] = "agent";
    NotificationType["SYSTEM"] = "system";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
var NotificationPriority;
(function (NotificationPriority) {
    NotificationPriority["LOW"] = "low";
    NotificationPriority["MEDIUM"] = "medium";
    NotificationPriority["HIGH"] = "high";
    NotificationPriority["CRITICAL"] = "critical";
})(NotificationPriority || (exports.NotificationPriority = NotificationPriority = {}));
const NotificationSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Types.ObjectId,
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
    href: {
        type: String,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
    createdAt: {
        type: Date,
    },
}, {
    timestamps: true,
});
exports.default = (0, mongoose_1.model)("Notification", NotificationSchema);
