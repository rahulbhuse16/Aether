"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notifications_1 = require("../controller/notifications");
const notificationsRouter = (0, express_1.Router)();
notificationsRouter.get("/stream/:userId", notifications_1.notificationsSSE);
notificationsRouter.get("/:id", notifications_1.getUserNotifications);
notificationsRouter.patch("/:id/:notificationId", notifications_1.markNotificationAsRead);
exports.default = notificationsRouter;
