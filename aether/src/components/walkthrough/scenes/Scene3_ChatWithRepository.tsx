import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Send, FileText, Sparkles, ChevronRight } from "lucide-react";

export default function Scene3_ChatWithRepository() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "ai"; content: string }>>([]);
  const [currentResponse, setCurrentResponse] = useState("");
  const [highlightedFiles, setHighlightedFiles] = useState<Set<string>>(new Set());

  const fullResponse = `The authentication flow uses JWT tokens for secure user sessions.

**Flow:**
1. Request → API Gateway
2. Gateway validates token at middleware layer
3. Auth Service verifies credentials
4. Session stored in Redis with 24h TTL
5. Response returned with refreshed token

**Key Files:**
- \`auth/middleware.ts\` - Token validation
- \`auth/jwt.ts\` - Token generation
- \`auth/session.ts\` - Session management`;

  useEffect(() => {
    // Add user message
    setTimeout(() => {
      setMessages([{ role: "user", content: "Explain authentication flow" }]);
    }, 500);

    // Stream AI response
    let index = 0;
    const responseInterval = setInterval(() => {
      if (index < fullResponse.length) {
        setCurrentResponse((prev) => prev + fullResponse[index]);
        index++;
      } else {
        clearInterval(responseInterval);
        setMessages((prev) => [...prev, { role: "ai", content: fullResponse }]);
      }
    }, 30);

    // Highlight files
    const files = ["auth/middleware.ts", "auth/jwt.ts", "auth/session.ts"];
    files.forEach((file, index) => {
      setTimeout(() => {
        setHighlightedFiles((prev) => new Set([...prev, file]));
      }, 1500 + (index * 500));
    });

    return () => clearInterval(responseInterval);
  }, []);

  return (
    <div className="h-full flex gap-4">
      {/* Chat Panel */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 flex flex-col"
      >
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[#8B7FE8]" />
          <h3 className="text-[14px] font-semibold text-[#F4F3EF]">
            AI Chat
          </h3>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto">
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-xl p-4 ${
                  message.role === "user"
                    ? "bg-[#8B7FE8] text-white"
                    : "border border-white/[0.08] bg-white/[0.02] text-[#F4F3EF]"
                }`}
              >
                <p className="text-[13px] whitespace-pre-wrap">{message.content}</p>
              </div>
            </motion.div>
          ))}

          {currentResponse && !messages.find((m) => m.role === "ai") && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="max-w-[80%] rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-[#8B7FE8] animate-pulse" />
                  <span className="text-[11px] text-[#55575F]">Aether is thinking...</span>
                </div>
                <p className="text-[13px] text-[#F4F3EF] whitespace-pre-wrap">
                  {currentResponse}
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-4 flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3"
        >
          <input
            type="text"
            placeholder="Ask anything about your codebase..."
            className="flex-1 bg-transparent text-[13px] text-[#F4F3EF] outline-none placeholder:text-[#55575F]"
            disabled
          />
          <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8B7FE8] text-white transition-colors hover:bg-[#A69DF0]">
            <Send className="h-4 w-4" />
          </button>
        </motion.div>
      </motion.div>

      {/* Referenced Files */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-72 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"
      >
        <h3 className="mb-4 text-[13px] font-semibold text-[#F4F3EF]">
          Referenced Files
        </h3>

        <div className="space-y-2">
          {["auth/middleware.ts", "auth/jwt.ts", "auth/session.ts"].map((file, index) => (
            <motion.div
              key={file}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.5 + (index * 0.5) }}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-all ${
                highlightedFiles.has(file)
                  ? "border-[#8B7FE8]/50 bg-[#8B7FE8]/10"
                  : "border-white/[0.06] bg-white/[0.02]"
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-[#22A67D]" />
              <span className="text-[11px] text-[#94969E]">{file}</span>
              {highlightedFiles.has(file) && (
                <ChevronRight className="ml-auto h-3.5 w-3.5 text-[#8B7FE8]" />
              )}
            </motion.div>
          ))}
        </div>

        {/* Architecture Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
          className="mt-4 rounded-lg border border-[#8B7FE8]/20 bg-[#8B7FE8]/5 p-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-[#8B7FE8]" />
            <span className="text-[11px] font-medium text-[#A69DF0]">
              Active Modules
            </span>
          </div>
          <div className="space-y-1">
            {["API Gateway", "Auth Service", "Redis"].map((module, index) => (
              <motion.div
                key={module}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2.2 + (index * 0.1) }}
                className="flex items-center gap-2"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-[#22A67D]" />
                <span className="text-[10px] text-[#94969E]">{module}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
