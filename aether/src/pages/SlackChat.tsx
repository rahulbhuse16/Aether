import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Hash, Send, Sparkles } from "lucide-react";
import { FaHandSparkles, FaSlack } from "react-icons/fa";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchSlackStatus } from "../store/slices/slackSlice";
import {
  fetchChannelMessages,
  sendChatMessage,
  setActiveChannel,
  addOptimisticMessage,
} from "../store/slices/slickChatSlice";
import { useNavigate } from "react-router";

const POLL_INTERVAL_MS = 4000;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Chat() {
  const dispatch = useAppDispatch();
  const userId = localStorage.getItem("userId") as string;
  const user = useAppSelector((s) => s.auth.user);
  const navigate=useNavigate()

  const { channels, connected } = useAppSelector((s) => s.slack);
  const { activeChannelId, messagesByChannel, sendingStatus } = useAppSelector(
    (s) => s.slackChat
  );

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeMessages = activeChannelId
    ? messagesByChannel[activeChannelId] || []
    : [];

  // Load Slack channels if the user landed here without visiting Settings first.
  useEffect(() => {
    if (userId && channels.length === 0) {
      dispatch(fetchSlackStatus(userId));
    }
  }, [dispatch, userId, channels.length]);

  // Default to the first channel once channels are available.


  // Fetch + poll the active channel's thread for new Slack-side messages.
  useEffect(() => {
    if (!userId || !activeChannelId) return;

    dispatch(fetchChannelMessages({ userId, channelId: activeChannelId }));


  }, [dispatch, userId, activeChannelId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [activeMessages.length]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || !activeChannelId) return;

    dispatch(
      addOptimisticMessage({
        channelId: activeChannelId,
        text,
        userName: user?.name || "You",
      })
    );
    dispatch(sendChatMessage({ userId, channelId: activeChannelId, text }));
    setDraft("");
  };

  const handleSlackAI=()=>{
    navigate("/slack-ai")
  }

  if (!connected) {
    return (
      <AppShell title="Chat">
        <div className="mx-auto max-w-3xl">
          <GlassCard className="py-10 text-center">
            <FaSlack className="mx-auto mb-3 h-6 w-6 text-[#94969E]" />
            <p className="text-[14px] text-[#F4F3EF]">Connect Slack to chat here</p>
            <p className="mt-1 text-[12.5px] text-[#94969E]">
              Head to Settings → Integrations to connect a workspace.
            </p>
          </GlassCard>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Chat">
      <div className="mx-auto flex h-[calc(100vh-140px)] max-w-5xl gap-4">
        {/* Channel sidebar */}
        <GlassCard className="w-64 shrink-0 overflow-y-auto p-2">
          <p className="px-2 py-2 text-[11px] uppercase tracking-wide text-[#55575F]">
            Channels
          </p>
          <div className="space-y-1">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => dispatch(setActiveChannel(channel.id))}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13.5px] transition-colors ${activeChannelId === channel.id
                    ? "bg-white/[0.06] text-[#F4F3EF]"
                    : "text-[#94969E] hover:bg-white/[0.03] hover:text-[#F4F3EF]"
                  }`}
              >
                <Hash className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{channel.name}</span>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Thread */}
        <GlassCard className="flex flex-1 flex-col overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-4">
            <Hash className="h-4 w-4 text-[#94969E]" />
            <p className="text-[14px] font-medium text-[#F4F3EF]">
              {channels.find((c) => c.id === activeChannelId)?.name ?? "Select a channel"}
            </p>
            <button
              onClick={handleSlackAI}
              className="
    ml-auto flex items-center gap-1.5
    rounded-full
    border border-white/10
    bg-black
    px-2.5 py-1
    text-[10px] font-medium tracking-wide text-white
    shadow-[0_0_12px_rgba(255,255,255,0.12),inset_0_0_8px_rgba(255,255,255,0.04)]
    transition-all duration-200
    hover:border-white/20
    hover:shadow-[0_0_16px_rgba(255,255,255,0.2)]
  "
            >
              <Sparkles size={12} className="text-white" />
              Slack AI
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {activeMessages.length === 0 && (
              <p className="pt-10 text-center text-[13px] text-[#55575F]">
                No messages yet. Say something to get the thread started.
              </p>
            )}
            {activeMessages.map((message, i) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 5) * 0.02 }}
                className="flex gap-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8B7FE8] to-[#22A67D] text-[11px] font-medium text-[#0A0B0D]">
                  {message?.userName?.[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-[13.5px] font-medium text-[#F4F3EF]">
                      {message?.userName}
                    </p>
                    {/* <p className="text-[11px] text-[#55575F]">
                      {formatTime(message.timestamp)}
                    </p> */}
                    {message.source === "slack" && (
                      <span className="flex items-center gap-1 rounded-full bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-[#94969E]">
                        <FaSlack className="h-2.5 w-2.5" />
                        via Slack
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[13.5px] leading-snug text-[#DADBE1]">
                    {message?.text}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-white/[0.06] px-4 py-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                activeChannelId
                  ? `Message #${channels.find((c) => c.id === activeChannelId)?.name ?? ""}`
                  : "Select a channel to start chatting"
              }
              disabled={!activeChannelId}
              className="flex-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[13.5px] text-[#F4F3EF] placeholder:text-[#55575F] focus:border-[#8B7FE8]/40 focus:outline-none disabled:opacity-50"
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!draft.trim() || sendingStatus === "sending"}
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </Button>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}