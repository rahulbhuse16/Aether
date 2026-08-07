import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

interface Notification {
  id: string;
  type: "success" | "warning" | "info";
  message: string;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

export default function NotificationCenter({ notifications, onRemove }: NotificationCenterProps) {
  return (
    <div className="fixed top-20 right-6 z-50 flex w-80 flex-col gap-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-[#0A0B0D]/95 backdrop-blur-xl p-4 shadow-2xl"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              {notification.type === "success" && (
                <CheckCircle2 className="h-4 w-4 text-[#22A67D]" />
              )}
              {notification.type === "warning" && (
                <AlertTriangle className="h-4 w-4 text-[#F0A35E]" />
              )}
              {notification.type === "info" && (
                <Info className="h-4 w-4 text-[#8B7FE8]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-[#F4F3EF]">{notification.message}</p>
            </div>
            <button
              onClick={() => onRemove(notification.id)}
              className="shrink-0 rounded-lg p-1 text-[#55575F] transition-colors hover:text-[#F4F3EF]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
