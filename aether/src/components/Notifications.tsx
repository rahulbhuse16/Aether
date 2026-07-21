import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  GitPullRequest,
  Bot,
  Gauge,
  Mic,
  CheckCheck,
  GitBranch,
  CircleAlert,
  CircleCheck,
  MessageCircle,
  Package,
  Workflow,
  ShieldAlert,
  CreditCard,
  Server,
  Settings,
  CircleX,
} from "lucide-react";

import {
  useAppDispatch,
  useAppSelector,
} from "../store/hooks";

import {
  addNotification,
  markAsRead,
  markAllAsRead,
  type AppNotification,
  type NotificationType,
} from "../store/slices/notificationSlice";

import { fetchUserNotifications,markNotificationAsRead } from "../services/notifications";
import { FaGithub } from "react-icons/fa";


// =====================================================
// ICON TYPES
// =====================================================

const TYPE_ICON: Record<
  NotificationType,
  React.ComponentType<{
    className?: string;
  }>
> = {
  ai: Bot,

  github: FaGithub,

  jira: GitPullRequest,

  repository: GitBranch,

  deployment: Workflow,

  security: ShieldAlert,

  usage: Gauge,

  billing: CreditCard,

  agent: Bot,

  system: Settings,
};


// =====================================================
// TYPE COLORS
// =====================================================

const TYPE_COLOR: Record<
  NotificationType,
  string
> = {
  ai: "text-[#8B7FE8]",

  github: "text-[#F4F3EF]",

  jira: "text-[#22A67D]",

  repository: "text-[#22A67D]",

  deployment: "text-[#8B7FE8]",

  security: "text-[#E0685F]",

  usage: "text-[#E0685F]",

  billing: "text-[#E0685F]",

  agent: "text-[#8B7FE8]",

  system: "text-[#94969E]",
};


// =====================================================
// DATE FORMATTER
// =====================================================

const formatNotificationTime = (
  date: string
): string => {
  const notificationDate = new Date(date);

  const now = new Date();

  const difference =
    now.getTime() -
    notificationDate.getTime();

  const seconds = Math.floor(
    difference / 1000
  );

  const minutes = Math.floor(
    seconds / 60
  );

  const hours = Math.floor(
    minutes / 60
  );

  const days = Math.floor(
    hours / 24
  );

  if (seconds < 60) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  if (days === 1) {
    return "Yesterday";
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  return notificationDate.toLocaleDateString();
};


// =====================================================
// COMPONENT
// =====================================================

export function Notifications() {
  const [open, setOpen] =
    useState(false);

  const dispatch =
    useAppDispatch();


  const {
    notifications,
    unreadCount,
    loading,
  } = useAppSelector(
    (state) => state.notifications
  );


  


  const userId = localStorage.getItem(
    "userId"
  );


  // ===================================================
  // FETCH NOTIFICATIONS WHEN DROPDOWN OPENS
  // ===================================================

  useEffect(() => {
    if (!open || !userId) {
      return;
    }

    dispatch(
      fetchUserNotifications({
        userId,

        page: 1,

        limit: 20,
      })
    );
  }, [
    open,
    userId,
    dispatch,
  ]);


  // ===================================================
  // MARK SINGLE NOTIFICATION AS READ
  // ===================================================

  const handleMarkAsRead = (
    notification: AppNotification
  ) => {
    if (
      notification.read ||
      !userId
    ) {
      return;
    }


    // Immediately update UI
    dispatch(
      markAsRead(
        notification._id
      )
    );


    // Persist in database
    dispatch(
      markNotificationAsRead({
        userId,

        notificationId:
          notification._id,
      })
    );
  };


  // ===================================================
  // MARK ALL AS READ
  // ===================================================

  const handleMarkAllAsRead = () => {
    notifications.forEach(
      (notification) => {
        if (!notification.read) {
          handleMarkAsRead(
            notification
          );
        }
      }
    );

    dispatch(
      markAllAsRead()
    );
  };


  return (
    <div className="relative">

      {/* =========================================
          BELL BUTTON
      ========================================== */}

      <button
        onClick={() =>
          setOpen(
            (value) => !value
          )
        }
        className="relative text-[#94969E] transition-colors hover:text-[#F4F3EF]"
        aria-label="Notifications"
      >

        <Bell className="h-[18px] w-[18px]" />


        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E0685F] px-1 text-[10px] font-medium leading-none text-[#0A0B0D]">
            {unreadCount > 9
              ? "9+"
              : unreadCount}
          </span>
        )}

      </button>


      {/* =========================================
          DROPDOWN
      ========================================== */}

      <AnimatePresence>

        {open && (
          <>

            {/* Overlay */}

            <div
              className="fixed inset-0 z-10"
              onClick={() =>
                setOpen(false)
              }
            />


            {/* Panel */}

            <motion.div
              initial={{
                opacity: 0,
                y: -6,
                scale: 0.98,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: -6,
                scale: 0.98,
              }}
              transition={{
                duration: 0.15,
              }}
              className="absolute right-0 top-[calc(100%+10px)] z-20 w-[360px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101215] shadow-2xl shadow-black/50"
            >

              {/* Header */}

              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">

                <span className="text-[13.5px] font-medium text-[#F4F3EF]">
                  Notifications
                </span>


                {unreadCount > 0 && (
                  <button
                    onClick={
                      handleMarkAllAsRead
                    }
                    className="flex items-center gap-1 text-[12px] text-[#94969E] transition-colors hover:text-[#F4F3EF]"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />

                    Mark all read
                  </button>
                )}

              </div>


              {/* Loading */}

              {loading && (
                <div className="px-4 py-10 text-center">

                  <p className="text-[13px] text-[#94969E]">
                    Loading notifications...
                  </p>

                </div>
              )}


              {/* Empty State */}

              {!loading &&
                notifications.length ===
                  0 && (
                  <div className="px-4 py-10 text-center">

                    <Bell className="mx-auto mb-3 h-6 w-6 text-[#55575F]" />

                    <p className="text-[13px] text-[#55575F]">
                      You're all caught up.
                    </p>

                  </div>
                )}


              {/* Notifications */}

              {!loading &&
                notifications.length >
                  0 && (

                  <div className="max-h-[380px] overflow-y-auto">

                    {notifications.map(
                      (notification) => {

                        const Icon =
                          TYPE_ICON[
                            notification.type
                          ] ?? Bell;


                        const iconColor =
                          TYPE_COLOR[
                            notification.type
                          ] ??
                          "text-[#94969E]";


                        return (
                          <Link
                            key={
                              notification._id
                            }
                            to={
                              notification.href ??
                              "#"
                            }
                            onClick={() => {

                              handleMarkAsRead(
                                notification
                              );


                              setOpen(
                                false
                              );

                            }}
                            className={`flex gap-3 border-b border-white/[0.04] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-white/[0.03] ${
                              notification.read
                                ? ""
                                : "bg-white/[0.02]"
                            }`}
                          >

                            {/* Icon */}

                            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">

                              <Icon
                                className={`h-4 w-4 ${iconColor}`}
                              />

                            </div>


                            {/* Content */}

                            <div className="min-w-0 flex-1">

                              <div className="flex items-start justify-between gap-2">

                                <p className="text-[13px] font-medium text-[#F4F3EF]">

                                  {
                                    notification.title
                                  }

                                </p>


                                {!notification.read && (
                                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#8B7FE8]" />
                                )}

                              </div>


                              <p className="mt-0.5 text-[12px] leading-relaxed text-[#94969E]">

                                {
                                  notification.description
                                }

                              </p>


                              <p className="mt-1 text-[11px] text-[#55575F]">

                                {formatNotificationTime(
                                  notification.createdAt
                                )}

                              </p>

                            </div>

                          </Link>
                        );
                      }
                    )}

                  </div>
                )}

            </motion.div>

          </>
        )}

      </AnimatePresence>

    </div>
  );
}