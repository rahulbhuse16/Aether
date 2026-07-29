import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Mail,
  MessageSquare,
  Save,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchUserNotifications } from "../services/notifications";
import { GoBackButton } from "../components/ui/GoBackButton";

interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

export default function NotificationSettings() {
  const dispatch = useAppDispatch();
  const userId = localStorage.getItem("userId") as string;
  const { notifications, loading } = useAppSelector(
    (s) => s.notifications
  );

  const [preferences, setPreferences] = useState<NotificationPreference[]>([
    {
      id: "pr-reviews",
      label: "PR Review Notifications",
      description: "Get notified when your pull requests are reviewed",
      icon: <MessageSquare className="h-4 w-4" />,
      enabled: true,
    },
    {
      id: "meeting-summaries",
      label: "Meeting Summaries",
      description: "Receive AI-generated summaries after meetings",
      icon: <Bell className="h-4 w-4" />,
      enabled: true,
    },
    {
      id: "ai-alerts",
      label: "AI Alerts",
      description: "Get notified about AI analysis results and insights",
      icon: <Mail className="h-4 w-4" />,
      enabled: false,
    },
    {
      id: "task-reminders",
      label: "Task Reminders",
      description: "Reminders for upcoming task deadlines",
      icon: <Bell className="h-4 w-4" />,
      enabled: true,
    },
  ]);

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserNotifications({ userId }));
    }
  }, [dispatch, userId]);

  const togglePreference = (id: string) => {
    setPreferences(
      preferences.map((pref) =>
        pref.id === id ? { ...pref, enabled: !pref.enabled } : pref
      )
    );
  };

  const handleSave = () => {
    // Save preferences logic here
    console.log("Saving preferences:", preferences);
  };

  return (
    <AppShell title="Notifications">
      <GoBackButton/>
      <div className="mx-auto max-w-3xl space-y-8">
        <PageSection label="Preferences" title="Notification Settings">
          <GlassCard>
            <div className="mb-6">
              <p className="text-[13px] text-[#94969E]">
                Manage how and when you receive notifications from Aether.
              </p>
            </div>

            <div className="space-y-3">
              {preferences.map((pref, index) => (
                <motion.div
                  key={pref.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                >
                  <GlassCard className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-[#94969E]">
                        {pref.icon}
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-[#F4F3EF]">
                          {pref.label}
                        </p>
                        <p className="text-[12px] text-[#55575F]">
                          {pref.description}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => togglePreference(pref.id)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        pref.enabled
                          ? "bg-[#8B7FE8]"
                          : "bg-white/[0.1]"
                      }`}
                    >
                      <motion.div
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                          pref.enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </GlassCard>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button size="sm" variant="ghost">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-3.5 w-3.5" />
                Save Changes
              </Button>
            </div>
          </GlassCard>
        </PageSection>

        <PageSection label="Recent" title="Recent Notifications" delay={0.05}>
          <GlassCard>
            {loading ? (
              <div className="py-8 text-center text-[13px] text-[#94969E]">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-[#94969E]">
                No recent notifications
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.slice(0, 5).map((notification, index) => (
                  <motion.div
                    key={notification._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                  >
                    <GlassCard
                      className={`flex items-start gap-3 py-3 ${
                        !notification.read ? "border-l-2 border-l-[#8B7FE8]" : ""
                      }`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#8B7FE8]/10 text-[#8B7FE8]">
                        <Bell className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#F4F3EF]">
                          {notification.title}
                        </p>
                        <p className="mt-1 text-[12px] text-[#94969E] line-clamp-2">
                          {notification.description}
                        </p>
                        <p className="mt-1 text-[11px] text-[#55575F]">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>
        </PageSection>
      </div>
    </AppShell>
  );
}
