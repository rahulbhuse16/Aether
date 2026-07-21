import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/api";

interface FetchNotificationsParams {
  userId: string;
  page?: number;
  limit?: number;
}

interface MarkNotificationAsReadParams {
  userId: string;
  notificationId: string;
}

interface NotificationResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    unreadCount: number;
  };
}

interface MarkNotificationResponse {
  success: boolean;
  message: string;
  notification: Notification;
}

/**
 * Fetch user notifications
 */
export const fetchUserNotifications = createAsyncThunk<
  NotificationResponse,
  FetchNotificationsParams,
  { rejectValue: string }
>(
  "notifications/fetchUserNotifications",

  async (
    {
      userId,
      page = 1,
      limit = 20,
    },
    thunkAPI
  ) => {
    try {
      const response = await api.get<NotificationResponse>(
        `/notifications/${userId}`,
        {
          params: {
            page,
            limit,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ??
          "Failed to fetch notifications"
      );
    }
  }
);


/**
 * Mark notification as read
 */
export const markNotificationAsRead = createAsyncThunk<
  MarkNotificationResponse,
  MarkNotificationAsReadParams,
  { rejectValue: string }
>(
  "notifications/markNotificationAsRead",

  async (
    {
      userId,
      notificationId,
    },
    thunkAPI
  ) => {
    try {
      const response =
        await api.patch<MarkNotificationResponse>(
          `/notifications/${userId}/${notificationId}/read`
        );

      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ??
          "Failed to mark notification as read"
      );
    }
  }
);