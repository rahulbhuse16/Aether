import { useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Hash, Link2, Unlink, RefreshCcw, MessageSquare, Sparkles } from "lucide-react";
import { FaSlack } from "react-icons/fa";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { slackService, type SlackNotificationPreferences } from "../services/slack";
import { disconnectSlack, fetchSlackStatus, setChannelNotification, setPreference, toggleChannelNotifications, updateSlackPreferences ,fetchSlackChannels} from "../store/slices/slackSlice";
import { useNavigate } from "react-router-dom";


const PREFERENCE_COPY: Record<
  keyof SlackNotificationPreferences,
  { label: string; desc: string }
> = {
  prReviews: {
    label: "PR reviews",
    desc: "Post when a pull request needs review or gets approved",
  },
  meetingSummaries: {
    label: "Meeting summaries",
    desc: "Send AI-generated recaps after calendar events end",
  },
  aiAlerts: {
    label: "AI alerts",
    desc: "Warn a channel when usage nears your monthly budget",
  },
  dailyDigest: {
    label: "Daily digest",
    desc: "A single rollup message each morning instead of live pings",
  },
};

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B7FE8] ${
        checked ? "bg-[#22A67D]" : "bg-white/[0.12]"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-[#F4F3EF] transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function Slack() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId") as string;
  const { connected, workspaceName, connectedAt, channels, preferences, status } =
    useAppSelector((s) => s.slack);

  useEffect(() => {
    if (userId) dispatch(fetchSlackStatus(userId));
    dispatch(fetchSlackChannels(userId))
  }, [dispatch, userId]);

  const handleConnect = () => slackService.connect(userId);

  const handleDisconnect = () => {
    dispatch(disconnectSlack(userId));
  };

  const handleChannelToggle = (channelId: string, next: boolean) => {
    dispatch(setChannelNotification({ channelId, enabled: next }));
    dispatch(toggleChannelNotifications({ userId, channelId, enabled: next }));
  };

  const handlePreferenceToggle = (
    key: keyof SlackNotificationPreferences,
    next: boolean
  ) => {
    dispatch(setPreference({ key, value: next }));
    dispatch(updateSlackPreferences({ userId, preferences: { [key]: next } }));
  };

  return (
    <AppShell title="Slack">
      <div className="mx-auto max-w-3xl space-y-8">
        


        <PageSection label="Workspace" title="Slack connection">
  <GlassCard>
    <div className="flex items-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#8B7FE8] to-[#22A67D] text-[#0A0B0D]">
        <FaSlack className="h-6 w-6" />
      </div>

      <div className="flex-1">
        <p className="text-[15px] font-medium text-[#F4F3EF]">
          {connected ? workspaceName : "Not connected"}
        </p>

        <p className="text-[13px] text-[#94969E]">
          {connected && connectedAt
            ? `Connected since ${new Date(
                connectedAt
              ).toLocaleDateString()}`
            : "Connect a workspace to send notifications to Slack"}
        </p>

        {status === "failed" && (
          <p className="mt-1 text-[12px] text-[#E8877F]">
            Couldn't refresh Slack status. Showing the last known state.
          </p>
        )}
      </div>

      {connected ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDisconnect}
        >
          <Unlink className="h-3.5 w-3.5" />
          Disconnect
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={handleConnect}
        >
          <Link2 className="h-3.5 w-3.5" />
          Connect Slack
        </Button>
      )}
    </div>
  </GlassCard>
</PageSection>

{/* Slack Channel Chat */}
{connected && (
  <PageSection
    label="Communication"
    title="Chat with channels"
  >
    <GlassCard>
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#36C5F0] to-[#611F69] text-white">
          <MessageSquare className="h-6 w-6" />
        </div>

        <div className="flex-1">
          <p className="text-[15px] font-medium text-[#F4F3EF]">
            Slack channel conversations
          </p>

          <p className="text-[13px] text-[#94969E]">
            Browse channels and chat with your Slack workspace
            directly from Aether.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => navigate("/slack-chat")}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Open Chat
        </Button>
      </div>
    </GlassCard>
  </PageSection>
)}

{connected && (
  <PageSection
    label="Intelligence"
    title="Slack AI"
  >
    <GlassCard>
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#8B7FE8] to-[#36C5F0] text-white">
          <Sparkles className="h-6 w-6" />
        </div>

        <div className="flex-1">
          <p className="text-[15px] font-medium text-[#F4F3EF]">
            Aether AI for Slack
          </p>

          <p className="text-[13px] text-[#94969E]">
            Ask questions, summarize conversations, analyze discussions,
            and get AI-powered insights from your Slack workspace.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => navigate("/slack-ai")}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Open Slack AI
        </Button>
      </div>
    </GlassCard>
  </PageSection>
)}

        {connected && (
          <>
            <PageSection label="Channels" title="Where updates get posted" delay={0.05}>
              <div className="space-y-2">
                {channels.map((channel, i) => (
                  <motion.div
                    key={channel.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * i }}
                  >
                    <GlassCard className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                          <Hash className="h-4 w-4 text-[#F4F3EF]" />
                        </div>
                        <p className="text-[14px] font-medium text-[#F4F3EF]">
                          {channel.name}
                        </p>
                      </div>
                      <Toggle
                        checked={channel.notificationsEnabled}
                        onChange={(next) => handleChannelToggle(channel.id, next)}
                      />
                    </GlassCard>
                  </motion.div>
                ))}
                {channels.length === 0 && (
                  <GlassCard className="py-6 text-center">
                    <p className="text-[13px] text-[#94969E]">
                      No channels yet. Invite the Aether bot to a channel in Slack to see it here.
                    </p>
                  </GlassCard>
                )}
              </div>
            </PageSection>

            <PageSection label="Notifications" title="What gets sent" delay={0.1}>
              <div className="space-y-2">
                {(Object.keys(PREFERENCE_COPY) as (keyof SlackNotificationPreferences)[]).map(
                  (key, i) => (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 * i }}
                    >
                      <GlassCard className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-3">
                          <Bell className="h-4 w-4 text-[#94969E]" />
                          <div>
                            <p className="text-[14px] text-[#F4F3EF]">
                              {PREFERENCE_COPY[key].label}
                            </p>
                            <p className="text-[12px] text-[#55575F]">
                              {PREFERENCE_COPY[key].desc}
                            </p>
                          </div>
                        </div>
                        <Toggle
                          checked={preferences[key]}
                          onChange={(next) => handlePreferenceToggle(key, next)}
                        />
                      </GlassCard>
                    </motion.div>
                  )
                )}
              </div>
            </PageSection>

            <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => dispatch(fetchSlackStatus(userId))}
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Refresh status
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}