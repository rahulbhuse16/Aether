import { useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setInput, addMessage, setTyping } from "../store/slices/chatSlice";

const SUGGESTIONS = [
  "Where is login implemented?",
  "How can I migrate Redux to Zustand?",
  "Show me the payment service architecture",
  "What tests cover the auth module?",
];

const MOCK_RESPONSES: Record<string, string> = {
  "where is login implemented":
    "Login is implemented in `src/auth/LoginPage.tsx` (UI) and `src/api/auth.ts` (API calls). The JWT middleware lives in `src/middleware/auth.ts`. AuthProvider wraps the app in `src/providers/AuthProvider.tsx`.",
  default:
    "Based on your codebase index, this spans 3 modules: `auth/`, `api/`, and `middleware/`. The main entry point is `AuthProvider.tsx`. Would you like me to generate a migration plan or open the relevant files?",
};

export default function RepositoryChat() {
  const dispatch = useAppDispatch();
  const { messages, input, isTyping } = useAppSelector((s) => s.chat);
  const currentProject = useAppSelector((s) =>
    s.projects.projects.find((p) => p.id === s.projects.currentProjectId)
  );

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      const userMsg = {
        id: `m-${Date.now()}`,
        role: "user" as const,
        content: text.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      dispatch(addMessage(userMsg));
      dispatch(setInput(""));
      dispatch(setTyping(true));

      setTimeout(() => {
        const key = text.toLowerCase();
        const matchKey = Object.keys(MOCK_RESPONSES).find(
          (k) => k !== "default" && key.includes(k)
        );
        const response = MOCK_RESPONSES[matchKey ?? "default"];
        dispatch(
          addMessage({
            id: `m-${Date.now()}-ai`,
            role: "assistant",
            content: response,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          })
        );
        dispatch(setTyping(false));
      }, 1200);
    },
    [dispatch]
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
            Indexed: <span className="text-[#F4F3EF]">{currentProject?.repo}</span> · RAG-powered
            codebase understanding
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
                  className={`max-w-[80%] rounded-xl px-4 py-3 ${
                    msg.role === "assistant"
                      ? "border border-white/[0.08] bg-white/[0.03]"
                      : "bg-[#8B7FE8]/15"
                  }`}
                >
                  <p className="text-[13.5px] leading-relaxed text-[#F4F3EF]">{msg.content}</p>
                  <span className="mt-1 block text-[11px] text-[#55575F]">{msg.timestamp}</span>
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

          <div className="border-t border-white/[0.06] p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1 text-[12px] text-[#94969E] transition-colors hover:border-[#8B7FE8]/30 hover:text-[#F4F3EF]"
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
                placeholder="Ask about your codebase..."
                className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-[13.5px] text-[#F4F3EF] placeholder:text-[#55575F] outline-none focus:border-[#8B7FE8]/40"
              />
              <Button type="submit" variant="primary" disabled={!input.trim() || isTyping}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
