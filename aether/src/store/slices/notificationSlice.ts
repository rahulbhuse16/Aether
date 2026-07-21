import {
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { fetchUserNotifications, markNotificationAsRead } from "../../services/notifications";




// =====================================================
// TYPES
// =====================================================

export type NotificationType =
  | "ai"
  | "github"
  | "jira"
  | "repository"
  | "deployment"
  | "security"
  | "usage"
  | "billing"
  | "agent"
  | "system";

export type NotificationPriority =
  | "low"
  | "medium"
  | "high"
  | "critical";

export interface AppNotification {
  _id: string;

  userId: string;

  type: NotificationType;

  priority: NotificationPriority;

  title: string;

  description: string;

  read: boolean;

  source: string;

  href?: string;

  icon?: string;

  metadata?: Record<string, unknown>;

  createdAt: string;

  updatedAt: string;
}


export interface NotificationsPagination {
  total: number;

  page: number;

  limit: number;

  totalPages: number;
}


export interface NotificationsState {
  notifications: AppNotification[];

  pagination: NotificationsPagination;

  unreadCount: number;

  loading: boolean;

  error: string | null;

  markingAsRead: boolean;
}


// =====================================================
// INITIAL STATE
// =====================================================

const initialState: NotificationsState = {
  notifications: [],

  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  },

  unreadCount: 0,

  loading: false,

  error: null,

  markingAsRead: false,
};


// =====================================================
// SLICE
// =====================================================

const notificationsSlice = createSlice({
  name: "notifications",

  initialState,

  reducers: {

    /**
     * Add a new real-time notification
     * received through SSE
     */
    addNotification: (
      state,
      action: PayloadAction<AppNotification>
    ) => {
      const notification = action.payload;

      // Prevent duplicate notifications
      const alreadyExists = state.notifications.some(
        (item) => item._id === notification._id
      );

      if (alreadyExists) {
        return;
      }

      state.notifications.unshift(notification);

      state.pagination.total += 1;

      if (!notification.read) {
        state.unreadCount += 1;
      }
    },


    /**
     * Mark notification as read locally
     */
    markAsRead: (
      state,
      action: PayloadAction<string>
    ) => {
      const notification = state.notifications.find(
        (item) => item._id === action.payload
      );

      if (
        notification &&
        !notification.read
      ) {
        notification.read = true;

        if (state.unreadCount > 0) {
          state.unreadCount -= 1;
        }
      }
    },


    /**
     * Mark all notifications as read locally
     */
    markAllAsRead: (state) => {
      state.notifications.forEach(
        (notification) => {
          notification.read = true;
        }
      );

      state.unreadCount = 0;
    },


    /**
     * Clear notifications
     */
    clearNotifications: (state) => {
      state.notifications = [];

      state.pagination = {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      state.unreadCount = 0;
    },
  },


  extraReducers: (builder) => {

    // =================================================
    // FETCH NOTIFICATIONS
    // =================================================

    builder

      .addCase(
        fetchUserNotifications.pending,
        (state) => {
          state.loading = true;

          state.error = null;
        }
      )


      .addCase(
        fetchUserNotifications.fulfilled,
        (state, action) => {
          state.loading = false;

          const response = action.payload;

          state.notifications =
            response.data.notifications;

          state.pagination =
            response.data.pagination;

          state.unreadCount =
            response.data.unreadCount;
        }
      )


      .addCase(
        fetchUserNotifications.rejected,
        (state, action) => {
          state.loading = false;

          state.error =
            action.payload ??
            "Failed to fetch notifications";
        }
      );


    // =================================================
    // MARK NOTIFICATION AS READ
    // =================================================

    builder

      .addCase(
        markNotificationAsRead.pending,
        (state) => {
          state.markingAsRead = true;
        }
      )


      .addCase(
        markNotificationAsRead.fulfilled,
        (
          state,
          action
        ) => {
          state.markingAsRead = false;

          const notification =
            action.payload.notification;

          const existingNotification =
            state.notifications.find(
              (item) =>
                item._id === notification._id
            );

          if (
            existingNotification &&
            !existingNotification.read
          ) {
            existingNotification.read = true;

            if (state.unreadCount > 0) {
              state.unreadCount -= 1;
            }
          }
        }
      )


      .addCase(
        markNotificationAsRead.rejected,
        (state) => {
          state.markingAsRead = false;
        }
      );
  },
});


// =====================================================
// ACTIONS
// =====================================================

export const {
  addNotification,
  markAsRead,
  markAllAsRead,
  clearNotifications,
} = notificationsSlice.actions;


// =====================================================
// SELECTORS
// =====================================================

export const selectNotifications = (
  state: {
    notifications: NotificationsState;
  }
) => state.notifications.notifications;


export const selectUnreadCount = (
  state: {
    notifications: NotificationsState;
  }
) => state.notifications.unreadCount;


export const selectNotificationsLoading = (
  state: {
    notifications: NotificationsState;
  }
) => state.notifications.loading;


export const selectNotificationsError = (
  state: {
    notifications: NotificationsState;
  }
) => state.notifications.error;


// =====================================================
// REDUCER
// =====================================================

export default notificationsSlice.reducer;