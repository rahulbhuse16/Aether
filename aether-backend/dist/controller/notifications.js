"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markNotificationAsRead = exports.getUserNotifications = exports.notificationsSSE = void 0;
const sse_1 = require("../services/sse");
const notification_1 = __importDefault(require("../models/notification"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const notificationsSSE = (req, res) => {
    const userId = req.params.userId;
    const token = req.query.token;
    if (!token) {
        return res.status(401).json({
            message: "Token is required",
        });
    }
    const decoded = jsonwebtoken_1.default.decode(token);
    if (!decoded?.exp) {
        return res.status(401).json({
            message: "Invalid token",
        });
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    (0, sse_1.addSseClient)(userId, res);
    const expiresIn = decoded.exp * 1000 - Date.now();
    const expiryTimer = setTimeout(() => {
        res.write(`event: token_expired\n` +
            `data: ${JSON.stringify({
                message: "JWT token expired",
            })}\n\n`);
        res.end();
    }, Math.max(expiresIn, 0));
    req.on("close", () => {
        clearTimeout(expiryTimer);
    });
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
