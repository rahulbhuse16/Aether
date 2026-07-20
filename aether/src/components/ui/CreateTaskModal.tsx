import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Sparkles } from "lucide-react";
import { FaGithub as FaGithubIcon } from "react-icons/fa";
import { GlassCard } from "./GlassCard";
import { Button } from "./Button";
import { useState } from "react";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (task: {
    title: string;
    status: "open" | "in_progress" | "done";
    source: "github" | "jira" | "ai";
    priority: "high" | "medium" | "low";
    dueDate?: string;
  }) => void;
}

const SOURCE_OPTIONS = [
  { value: "ai", label: "AI Generated", icon: <Sparkles className="h-3.5 w-3.5" /> },
  { value: "github", label: "GitHub", icon: <FaGithubIcon className="h-3.5 w-3.5" /> },
  { value: "jira", label: "Jira", icon: <span className="text-[10px] font-bold">J</span> },
] as const;

const STATUS_OPTIONS = [
  { value: "open", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "high", label: "High", color: "text-[#E0685F]" },
  { value: "medium", label: "Medium", color: "text-[#8B7FE8]" },
  { value: "low", label: "Low", color: "text-[#94969E]" },
] as const;

export function CreateTaskModal({ isOpen, onClose, onCreateTask }: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"open" | "in_progress" | "done">("open");
  const [source, setSource] = useState<"github" | "jira" | "ai">("ai");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onCreateTask({
      title: title.trim(),
      status,
      source,
      priority,
      dueDate: dueDate || undefined,
    });

    // Reset form
    setTitle("");
    setStatus("open");
    setSource("ai");
    setPriority("medium");
    setDueDate("");
    onClose();
  };

  const handleClose = () => {
    setTitle("");
    setStatus("open");
    setSource("ai");
    setPriority("medium");
    setDueDate("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg"
            >
              <GlassCard className="p-6">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-[16px] font-medium text-[#F4F3EF]">Create new task</h2>
                    <p className="mt-1 text-[12px] text-[#55575F]">
                      Add a task to your unified board
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.02] text-[#94969E] transition-colors hover:bg-white/[0.04] hover:text-[#F4F3EF]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Title */}
                  <div>
                    <label className="mb-2 block text-[12px] font-medium text-[#94969E]">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What needs to be done?"
                      className="w-full rounded-lg border border-white/[0.1] bg-white/[0.02] px-4 py-2.5 text-[13px] text-[#F4F3EF] placeholder:text-[#55575F] focus:border-[#8B7FE8]/50 focus:outline-none focus:ring-1 focus:ring-[#8B7FE8]/50"
                      autoFocus
                    />
                  </div>

                  {/* Source */}
                  <div>
                    <label className="mb-2 block text-[12px] font-medium text-[#94969E]">
                      Source
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {SOURCE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSource(option.value)}
                          className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-2.5 transition-colors ${
                            source === option.value
                              ? "border-[#8B7FE8]/50 bg-[#8B7FE8]/10 text-[#8B7FE8]"
                              : "border-white/[0.1] bg-white/[0.02] text-[#55575F] hover:bg-white/[0.04] hover:text-[#94969E]"
                          }`}
                        >
                          {option.icon}
                          <span className="text-[11px]">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="mb-2 block text-[12px] font-medium text-[#94969E]">
                      Status
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {STATUS_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setStatus(option.value)}
                          className={`rounded-lg border px-3 py-2 text-[12px] transition-colors ${
                            status === option.value
                              ? "border-[#8B7FE8]/50 bg-[#8B7FE8]/10 text-[#8B7FE8]"
                              : "border-white/[0.1] bg-white/[0.02] text-[#55575F] hover:bg-white/[0.04] hover:text-[#94969E]"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="mb-2 block text-[12px] font-medium text-[#94969E]">
                      Priority
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PRIORITY_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPriority(option.value)}
                          className={`rounded-lg border px-3 py-2 text-[12px] font-mono uppercase transition-colors ${
                            priority === option.value
                              ? `border-[${option.color.replace("text-", "")}]/50 bg-[${option.color.replace("text-", "")}]/10 ${option.color}`
                              : "border-white/[0.1] bg-white/[0.02] text-[#55575F] hover:bg-white/[0.04] hover:text-[#94969E]"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="mb-2 block text-[12px] font-medium text-[#94969E]">
                      Due date (optional)
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#55575F]" />
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full rounded-lg border border-white/[0.1] bg-white/[0.02] px-4 py-2.5 pl-10 text-[13px] text-[#F4F3EF] focus:border-[#8B7FE8]/50 focus:outline-none focus:ring-1 focus:ring-[#8B7FE8]/50 [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex-1"
                      onClick={handleClose}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="flex-1"
                      disabled={!title.trim()}
                    >
                      Create task
                    </Button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
