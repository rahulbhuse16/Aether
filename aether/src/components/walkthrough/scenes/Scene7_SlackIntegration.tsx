import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Hash, Sparkles, CheckCircle2, Send } from "lucide-react";

export default function Scene7_SlackIntegration() {
  const [slackNotification, setSlackNotification] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [decisions, setDecisions] = useState<Array<{ text: string; highlighted: boolean }>>([]);

  const fullResponse = "The engineering team discussed implementing tiered rate limiting for the API. Key decisions:\n\n• Implement 3 tiers: Free (100 req/min), Pro (500 req/min), Enterprise (unlimited)\n• Use Redis for rate limit tracking\n• Add rate limit headers to all responses\n• Timeline: 2 weeks for implementation\n• Backend team assigned";

  useEffect(() => {
    // Show Slack notification
    setTimeout(() => {
      setSlackNotification(true);
    }, 500);

    // User asks question
    setTimeout(() => {
      setUserMessage("Summarize engineering discussion");
    }, 1500);

    // Stream AI response
    let index = 0;
    const responseInterval = setInterval(() => {
      if (index < fullResponse.length) {
        setAiResponse((prev) => prev + fullResponse[index]);
        index++;
      } else {
        clearInterval(responseInterval);
      }
    }, 20);

    // Highlight decisions
    const decisionItems = [
      { text: "Implement tiered rate limiting", highlighted: true },
      { text: "Use Redis for tracking", highlighted: true },
      { text: "Timeline: 2 weeks", highlighted: true },
      { text: "Backend team assigned", highlighted: true },
    ];

    decisionItems.forEach((decision, index) => {
      setTimeout(() => {
        setDecisions((prev) => [...prev, decision]);
      }, 2500 + (index * 400));
    });

    return () => clearInterval(responseInterval);
  }, []);

  return (
    <div className="h-full flex gap-4">
      {/* Slack Preview */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-96 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 flex flex-col"
      >
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[#8B7FE8]" />
          <h3 className="text-[14px] font-semibold text-[#F4F3EF]">
            Slack
          </h3>
        </div>

        {/* Slack Notification */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-4 rounded-xl border p-4 transition-all ${
            slackNotification
              ? "border-[#8B7FE8]/30 bg-[#8B7FE8]/10"
              : "border-white/[0.06] bg-white/[0.02]"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8B7FE8]">
              <Hash className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-medium text-[#F4F3EF]">
                #engineering
              </p>
              <p className="text-[11px] text-[#94969E]">
                A PR requires review: #234 - Add user profile
              </p>
            </div>
          </div>
        </motion.div>

        {/* Chat Interface */}
        <div className="flex-1 rounded-xl border border-white/[0.06] bg-[#0A0B0D] p-4">
          <div className="space-y-4">
            {/* User Message */}
            {userMessage && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex justify-end"
              >
                <div className="max-w-[80%] rounded-lg bg-[#8B7FE8] px-3 py-2">
                  <p className="text-[12px] text-white">{userMessage}</p>
                </div>
              </motion.div>
            )}

            {/* AI Response */}
            {aiResponse && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#8B7FE8]/10">
                  <Sparkles className="h-3.5 w-3.5 text-[#8B7FE8]" />
                </div>
                <div className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                  <p className="text-[12px] text-[#F4F3EF] whitespace-pre-wrap">
                    {aiResponse}
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Input */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-4 flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2"
        >
          <input
            type="text"
            placeholder="Ask Aether..."
            className="flex-1 bg-transparent text-[12px] text-[#F4F3EF] outline-none placeholder:text-[#55575F]"
            disabled
          />
          <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8B7FE8] text-white transition-colors hover:bg-[#A69DF0]">
            <Send className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      </motion.div>

      {/* Key Decisions */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
      >
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-[#22A67D]" />
          <h3 className="text-[14px] font-semibold text-[#F4F3EF]">
            Key Decisions
          </h3>
        </div>

        <div className="space-y-2">
          {decisions.map((decision, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all ${
                decision.highlighted
                  ? "border-[#22A67D]/30 bg-[#22A67D]/10"
                  : "border-white/[0.06] bg-white/[0.02]"
              }`}
            >
              {decision.highlighted && (
                <CheckCircle2 className="h-4 w-4 text-[#22A67D]" />
              )}
              <span className={`text-[13px] ${decision.highlighted ? "text-[#F4F3EF]" : "text-[#94969E]"}`}>
                {decision.text}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
          className="mt-6 grid grid-cols-3 gap-3"
        >
          {[
            { label: "Messages", value: "47" },
            { label: "Participants", value: "8" },
            { label: "Duration", value: "45m" },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2.2 + (index * 0.1) }}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-center"
            >
              <p className="text-[11px] text-[#55575F]">{stat.label}</p>
              <p className="mt-1 text-[16px] font-semibold text-[#F4F3EF]">{stat.value}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
