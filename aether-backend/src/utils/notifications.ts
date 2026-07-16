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