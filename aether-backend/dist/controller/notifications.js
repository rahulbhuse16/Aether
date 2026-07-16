"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markNotificationAsRead = exports.getUserNotifications = exports.notificationsSSE = void 0;
const sse_1 = require("../services/sse");
const notification_1 = __importDefault(require("../models/notification"));
const notificationsSSE = (req, res) => {
    const userId = req.params.userId;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    (0, sse_1.addSseClient)(userId, res);
};
exports.notificationsSSE = notificationsSSE;
/**
 * Get logged-in user notifications
 */
const getUserNotifications = async (req, res) => {
    try {
        const userId = req.params.id;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const [notifications, total, unreadCount] = await Promise.all([
            notification_1.default.find({
                userId,
            })
                .sort({
                createdAt: -1,
            })
                .skip(skip)
                .limit(limit)
                .lean(),
            notification_1.default.countDocuments({
                userId,
            }),
            notification_1.default.countDocuments({
                userId,
                read: false,
            })
        ]);
        return res.status(200).json({
            success: true,
            data: {
                notifications,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                },
                unreadCount
            }
        });
    }
    catch (error) {
        console.error("getUserNotifications error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch notifications"
        });
    }
};
exports.getUserNotifications = getUserNotifications;
/**
 * Mark notification as read
 */
const markNotificationAsRead = async (req, res) => {
    try {
        const userId = req.params.id;
        const { notificationId } = req.params;
        const notification = await notification_1.default.findOneAndUpdate({
            _id: notificationId,
            userId
        }, {
            $set: {
                read: true
            }
        }, {
            new: true
        });
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }
        return res.status(200).json({
            success: true,
            message: "Notification marked as read",
            notification
        });
    }
    catch (error) {
        console.error("markNotificationAsRead error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update notification"
        });
    }
};
exports.markNotificationAsRead = markNotificationAsRead;
