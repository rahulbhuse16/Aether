// Path: src/components/Notifications.tsx
//
// Self-contained: renders both the bell trigger (with unread badge) and
// the dropdown panel. Drop it straight into AppShell's topbar in place
// of the current plain <Bell> button:
//
//   <Notifications />
//
// Reads/writes notificationsSlice — same pattern as the project switcher
// in AppShell reading/writing projectsSlice.

import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  GitPullRequest,
  Bot,
  Gauge,
  Mic,
  CheckCheck,
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { markAsRead, markAllAsRead, type NotificationType } from "../store/slices/notificationSlice";

const TYPE_ICON: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  review: GitPullRequest,
  agent: Bot,
  budget: Gauge,
  meeting: Mic,
};

const TYPE_COLOR: Record<NotificationType, string> = {
  review: "text-[#22A67D]",
  agent: "text-[#8B7FE8]",
  budget: "text-[#E0685F]",
  meeting: "text-[#22A67D]",
};

export function Notifications() {
  const [open, setOpen] = useState(false);
  const items = useAppSelector((s) => s.notifications);
  const dispatch = useAppDispatch();

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative text-[#94969E] transition-colors hover:text-[#F4F3EF]"
        aria-label="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E0685F] px-1 text-[10px] font-medium leading-none text-[#0A0B0D]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-[calc(100%+10px)] z-20 w-[360px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101215] shadow-2xl shadow-black/50"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                <span className="text-[13.5px] font-medium text-[#F4F3EF]">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => dispatch(markAllAsRead())}
                    className="flex items-center gap-1 text-[12px] text-[#94969E] transition-colors hover:text-[#F4F3EF]"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              {items.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-[13px] text-[#55575F]">
                    You're all caught up.
                  </p>
                </div>
              ) : (
                <div className="max-h-[380px] overflow-y-auto">
                  {items.map((n) => {
                    const Icon = TYPE_ICON[n.type];
                    return (
                      <Link
                        key={n.id}
                        to={n.href ?? "#"}
                        onClick={() => {
                          dispatch(markAsRead(n.id));
                          setOpen(false);
                        }}
                        className={`flex gap-3 border-b border-white/[0.04] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-white/[0.03] ${
                          n.read ? "" : "bg-white/[0.02]"
                        }`}
                      >
                        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                          <Icon className={`h-4 w-4 ${TYPE_COLOR[n.type]}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] font-medium text-[#F4F3EF]">
                              {n.title}
                            </p>
                            {!n.read && (
                              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#8B7FE8]" />
                            )}
                          </div>
                          <p className="mt-0.5 text-[12px] leading-relaxed text-[#94969E]">
                            {n.description}
                          </p>
                          <p className="mt-1 text-[11px] text-[#55575F]">{n.time}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}