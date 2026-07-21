
import { Router } from "express";
import { notificationsSSE,getUserNotifications,markNotificationAsRead } from "../controller/notifications";
import { verifyJWT } from "../middleware/auth";

const notificationsRouter = Router();

notificationsRouter.get("/stream/:userId", notificationsSSE);
notificationsRouter.get("/:id",verifyJWT, getUserNotifications)
notificationsRouter.patch("/:id/:notificationId/read",verifyJWT,markNotificationAsRead)


export default notificationsRouter;



