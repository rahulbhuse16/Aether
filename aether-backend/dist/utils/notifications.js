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
exports.saveNotification = void 0;
const notification_1 = __importStar(require("../models/notification"));
const sse_1 = require("../services/sse");
const saveNotification = async (payload) => {
    const { userId, type, priority, title, description, href, metadata, } = payload;
    /**
     * Prevent duplicate USAGE notifications
     * Only allow one usage notification per user per day.
     */
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
    /**
     * Save notification
     */
    const notification = await notification_1.default.create({
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
    (0, sse_1.sendSseEvent)(userId, "notification", notification);
    return notification;
};
exports.saveNotification = saveNotification;
