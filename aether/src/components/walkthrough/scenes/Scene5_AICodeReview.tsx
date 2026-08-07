import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GitPullRequest, CheckCircle2, FileText, Shield, Zap, ChevronRight } from "lucide-react";

export default function Scene5_AICodeReview() {
  const [reviewProgress, setReviewProgress] = useState(0);
  const [suggestions, setSuggestions] = useState<Array<{
    type: "performance" | "security" | "accessibility";
    message: string;
  }>>([]);
  const [prStatus, setPrStatus] = useState<"pending" | "approved">("pending");

  const mockSuggestions = [
    { type: "performance" as const, message: "Consider memoizing this component to prevent re-renders" },
    { type: "security" as const, message: "Add input validation on the user ID parameter" },
    { type: "accessibility" as const, message: "Add aria-label to the button element" },
  ];

  useEffect(() => {
    // Animate review progress
    const reviewInterval = setInterval(() => {
      setReviewProgress((prev) => {
        if (prev >= 100) {
          clearInterval(reviewInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 40);

    // Reveal suggestions progressively
    mockSuggestions.forEach((suggestion, index) => {
      setTimeout(() => {
        setSuggestions((prev) => [...prev, suggestion]);
      }, 1000 + (index * 600));
    });

    // Auto-approve PR
    setTimeout(() => {
      setPrStatus("approved");
    }, 4000);

    return () => clearInterval(reviewInterval);
  }, []);

  const suggestionIcons = {
    performance: Zap,
    security: Shield,
    accessibility: CheckCircle2,
  };

  const suggestionColors = {
    performance: "text-[#F0A35E] bg-[#F0A35E]/10 border-[#F0A35E]/20",
    security: "text-[#E8877F] bg-[#E8877F]/10 border-[#E8877F]/20",
    accessibility: "text-[#22A67D] bg-[#22A67D]/10 border-[#22A67D]/20",
  };

  return (
    <div className="h-full flex gap-4">
      {/* PR Panel */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-96 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 flex flex-col"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitPullRequest className="h-5 w-5 text-[#8B7FE8]" />
            <h3 className="text-[14px] font-semibold text-[#F4F3EF]">
              Pull Request #234
            </h3>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              prStatus === "approved"
                ? "bg-[#22A67D]/10 text-[#22A67D]"
                : "bg-[#F0A35E]/10 text-[#F0A35E]"
            }`}
          >
            {prStatus === "approved" ? "Approved" : "In Review"}
          </span>
        </div>

        {/* PR Info */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#55575F]">Title</span>
            <span className="text-[#F4F3EF]">Add user profile</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#55575F]">Branch</span>
            <span className="text-[#94969E]">feature/user-profile → main</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#55575F]">Files Changed</span>
            <span className="text-[#F4F3EF]">12</span>
          </div>
        </div>

        {/* Review Progress */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] text-[#94969E]">AI Reviewing...</span>
            <span className="text-[12px] font-medium text-[#F4F3EF]">
              {reviewProgress}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
            <motion.div
              className="h-full rounded-full bg-[#8B7FE8]"
              style={{ width: `${reviewProgress}%` }}
            />
          </div>
        </div>

        {/* Changed Files */}
        <div className="flex-1 space-y-2 overflow-y-auto">
          {["UserProfile.tsx", "api/user.ts", "types/user.ts"].map((file, index) => (
            <motion.div
              key={file}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
            >
              <FileText className="h-3.5 w-3.5 text-[#22A67D]" />
              <span className="text-[11px] text-[#94969E]">{file}</span>
              <ChevronRight className="ml-auto h-3.5 w-3.5 text-[#55575F]" />
            </motion.div>
          ))}
        </div>

        {/* Approve Button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3 }}
          className={`mt-4 w-full rounded-xl py-3 text-[13px] font-medium transition-all ${
            prStatus === "approved"
              ? "bg-[#22A67D] text-white"
              : "bg-white/[0.04] text-[#55575F]"
          }`}
        >
          {prStatus === "approved" ? (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Approved
            </span>
          ) : (
            "Approve Changes"
          )}
        </motion.button>
      </motion.div>

      {/* AI Review Panel */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
      >
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#8B7FE8]" />
          <h3 className="text-[14px] font-semibold text-[#F4F3EF]">
            AI Code Review
          </h3>
        </div>

        {/* Review Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 grid grid-cols-3 gap-3"
        >
          {[
            { label: "Performance", value: "No issues", color: "text-[#22A67D]" },
            { label: "Security", value: "1 warning", color: "text-[#F0A35E]" },
            { label: "Accessibility", value: "Passed", color: "text-[#22A67D]" },
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + (index * 0.1) }}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
            >
              <p className="text-[11px] text-[#55575F]">{metric.label}</p>
              <p className={`mt-1 text-[13px] font-medium ${metric.color}`}>
                {metric.value}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Suggestions */}
        <div className="space-y-2">
          <h4 className="text-[12px] font-semibold text-[#F4F3EF]">
            Suggestions
          </h4>
          {suggestions.map((suggestion, index) => {
            const Icon = suggestionIcons[suggestion.type];
            const colors = suggestionColors[suggestion.type];
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + (index * 0.3) }}
                className={`flex items-start gap-3 rounded-lg border p-3 ${colors}`}
              >
                <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#F4F3EF]">{suggestion.message}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Recommendation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5 }}
          className="mt-6 rounded-xl border border-[#22A67D]/20 bg-[#22A67D]/5 p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-[#22A67D]" />
            <span className="text-[12px] font-semibold text-[#22A67D]">
              Recommendation
            </span>
          </div>
          <p className="text-[12px] text-[#94969E]">
            Code quality is good. Minor suggestions for improvement. Safe to merge after
            addressing the security warning.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
