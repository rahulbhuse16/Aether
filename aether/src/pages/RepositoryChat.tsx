import { useCallback, useState, type JSX } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Bot, FileCode2, Send, Sparkles, User } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setInput, addMessage, setTyping } from "../store/slices/chatSlice";
import { sendRepoChatMessage, type ChatHistoryTurn } from "../services/chatwithRepo";

const SUGGESTIONS = [
  "Where is login implemented?",
  "How can I migrate Redux to Zustand?",
  "Show me the payment service architecture",
  "What tests cover the auth module?",
];

/**
 * Splits assistant markdown on ```lang fenced code blocks so code renders
 * in a monospace block instead of running together with prose. Anything
 * this doesn't recognize just falls through as plain text — good enough
 * for chat content without pulling in a full markdown renderer.
 */
function renderContent(content: string) {
  const parts = content.split(/```(\w*)\n?([\s\S]*?)```/g);
  const nodes: JSX.Element[] = [];

  for (let i = 0; i < parts.length; i += 3) {
    const text = parts[i];
    const lang = parts[i + 1];
    const code = parts[i + 2];

    if (text) {
      nodes.push(
        <p key={`t-${i}`} className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#F4F3EF]">
          {text.trim()}
        </p>
      );
    }
    if (code !== undefined) {
      nodes.push(
        <pre
          key={`c-${i}`}
          className="overflow-x-auto rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2.5 font-mono text-[12px] text-[#B8E8D4]"
        >
          {lang && <div className="mb-1.5 text-[10.5px] uppercase tracking-wide text-[#55575F]">{lang}</div>}
          <code>{code.replace(/\n$/, "")}</code>
        </pre>
      );
    }
  }

  return nodes;
}

export default function RepositoryChat() {
  const dispatch = useAppDispatch();
  const { messages, input, isTyping } = useAppSelector((s) => s.chat);
  const currentProject = useAppSelector((s) =>
    s.projects.projects.find((p) => p.id === s.projects.currentProjectId)
  );

  const projects=useAppSelector((s)=>s.projects)

  console.log("p",projects)

  const [sendError, setSendError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !currentProject) return;

      setSendError(null);
      setLastFailedMessage(null);

      const history: ChatHistoryTurn[] = messages
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      dispatch(
        addMessage({
          id: `m-${Date.now()}`,
          role: "user",
          content: trimmed,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        })
      );
      dispatch(setInput(""));
      dispatch(setTyping(true));

      try {
        const reply = await sendRepoChatMessage(projects.currentRepoId, trimmed, history);
        dispatch(addMessage(reply));
      } catch (err) {
        setSendError((err as Error).message);
        setLastFailedMessage(trimmed);
      } finally {
        dispatch(setTyping(false));
      }
    },
    [dispatch, messages, currentProject]
  );

  return (
    <AppShell title="Chat with repository">
      <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-4xl flex-col">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <p className="text-[13px] text-[#94969E]">
            Indexed: <span className="text-[#F4F3EF]">{currentProject?.repo ?? "no repository selected"}</span> ·
            RAG-powered codebase understanding
          </p>
        </motion.div>

        <GlassCard highlight className="mb-4 flex flex-1 flex-col overflow-hidden p-0">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                    msg.role === "assistant"
                      ? "bg-gradient-to-br from-[#8B7FE8] to-[#22A67D]"
                      : "bg-white/[0.08]"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <Bot className="h-4 w-4 text-[#0A0B0D]" />
                  ) : (
                    <User className="h-4 w-4 text-[#F4F3EF]" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] space-y-2 rounded-xl px-4 py-3 ${
                    msg.role === "assistant"
                      ? "border border-white/[0.08] bg-white/[0.03]"
                      : "bg-[#8B7FE8]/15"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    renderContent(msg.content)
                  ) : (
                    <p className="text-[13.5px] leading-relaxed text-[#F4F3EF]">{msg.content}</p>
                  )}

                  {"sources" in msg && (msg as { sources?: string[] }).sources?.length ? (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {(msg as { sources?: string[] }).sources!.map((path) => (
                        <span
                          key={path}
                          className="flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-mono text-[10.5px] text-[#94969E]"
                        >
                          <FileCode2 className="h-3 w-3 text-[#22A67D]" />
                          {path}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <span className="block text-[11px] text-[#55575F]">{msg.timestamp}</span>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#8B7FE8] to-[#22A67D]">
                  <Bot className="h-4 w-4 text-[#0A0B0D]" />
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-2 w-2 rounded-full bg-[#94969E]"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {sendError && (
            <div className="mx-4 mb-3 flex items-start gap-2 rounded-lg border border-[#E8836B]/30 bg-[#E8836B]/[0.06] px-3.5 py-2.5">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#E8836B]" />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] text-[#F4F3EF]">{sendError}</p>
                {lastFailedMessage && (
                  <button
                    onClick={() => sendMessage(lastFailedMessage)}
                    className="mt-1 text-[12px] font-medium text-[#8B7FE8] hover:text-[#a599ec]"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-white/[0.06] p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  disabled={!currentProject || isTyping}
                  className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1 text-[12px] text-[#94969E] transition-colors hover:border-[#8B7FE8]/30 hover:text-[#F4F3EF] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Sparkles className="h-3 w-3 text-[#22A67D]" />
                  {s}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => dispatch(setInput(e.target.value))}
                placeholder={
                  currentProject
                    ? "Ask about your codebase..."
                    : "Select a project to start chatting"
                }
                disabled={!currentProject}
                className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-[13.5px] text-[#F4F3EF] placeholder:text-[#55575F] outline-none focus:border-[#8B7FE8]/40 disabled:opacity-50"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={!input.trim() || isTyping || !currentProject}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}