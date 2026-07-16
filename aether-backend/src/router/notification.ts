
import { Router } from "express";
import { notificationsSSE,getUserNotifications,markNotificationAsRead } from "../controller/notifications";

const notificationsRouter = Router();

notificationsRouter.get("/stream/:userId", notificationsSSE);
notificationsRouter.get("/:id",getUserNotifications)
notificationsRouter.patch("/:id/:notificationId",markNotificationAsRead)


export default notificationsRouter;



