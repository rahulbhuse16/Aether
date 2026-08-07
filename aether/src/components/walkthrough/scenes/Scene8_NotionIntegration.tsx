import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Layers, FileText, CheckCircle2, Sparkles, ListTodo, BookOpen } from "lucide-react";

export default function Scene8_NotionIntegration() {
  const [tasksExtracted, setTasksExtracted] = useState(0);
  const [docsUpdated, setDocsUpdated] = useState(0);
  const [tasks, setTasks] = useState<Array<{ text: string; completed: boolean }>>([]);
  const [syncProgress, setSyncProgress] = useState(0);

  const mockTasks = [
    { text: "Implement user authentication flow", completed: true },
    { text: "Add rate limiting to API endpoints", completed: true },
    { text: "Update API documentation", completed: true },
    { text: "Create architecture diagrams", completed: true },
    { text: "Set up Redis for session storage", completed: false },
    { text: "Add unit tests for auth module", completed: false },
  ];

  useEffect(() => {
    // Animate tasks extracted
    const tasksInterval = setInterval(() => {
      setTasksExtracted((prev) => {
        if (prev >= 8) {
          clearInterval(tasksInterval);
          return 8;
        }
        return prev + 1;
      });
    }, 200);

    // Animate docs updated
    const docsInterval = setInterval(() => {
      setDocsUpdated((prev) => {
        if (prev >= 5) {
          clearInterval(docsInterval);
          return 5;
        }
        return prev + 1;
      });
    }, 300);

    // Animate sync progress
    const syncInterval = setInterval(() => {
      setSyncProgress((prev) => {
        if (prev >= 100) {
          clearInterval(syncInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 40);

    // Reveal tasks progressively
    mockTasks.forEach((task, index) => {
      setTimeout(() => {
        setTasks((prev) => [...prev, task]);
      }, 800 + (index * 400));
    });

    return () => {
      clearInterval(tasksInterval);
      clearInterval(docsInterval);
      clearInterval(syncInterval);
    };
  }, []);

  return (
    <div className="h-full flex gap-4">
      {/* Notion Document */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-96 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 flex flex-col"
      >
        <div className="mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-[#8B7FE8]" />
          <h3 className="text-[14px] font-semibold text-[#F4F3EF]">
            Requirements v2.0
          </h3>
        </div>

        {/* Document Content */}
        <div className="flex-1 rounded-xl border border-white/[0.06] bg-[#0A0B0D] p-4 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <h4 className="text-[13px] font-semibold text-[#F4F3EF] mb-2">
                Project Requirements
              </h4>
              <p className="text-[11px] text-[#94969E] leading-relaxed">
                Update authentication system with JWT tokens and implement tiered rate limiting
                for API endpoints.
              </p>
            </div>

            <div className="border-t border-white/[0.06] pt-4">
              <div className="flex items-center gap-2 mb-3">
                <ListTodo className="h-4 w-4 text-[#22A67D]" />
                <span className="text-[12px] font-medium text-[#F4F3EF]">
                  Extracted Tasks ({tasksExtracted})
                </span>
              </div>

              <div className="space-y-2">
                {tasks.map((task, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                  >
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded border ${
                        task.completed
                          ? "border-[#22A67D] bg-[#22A67D]"
                          : "border-white/[0.2] bg-white/[0.02]"
                      }`}
                    >
                      {task.completed && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <span className="text-[11px] text-[#94969E]">{task.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sync Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-4 flex items-center gap-2 rounded-lg border border-[#8B7FE8]/20 bg-[#8B7FE8]/5 px-3 py-2"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#8B7FE8] animate-pulse" />
          <span className="text-[11px] text-[#A69DF0]">
            Syncing with Notion... {syncProgress}%
          </span>
        </motion.div>
      </motion.div>

      {/* Documentation Updates */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
      >
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[#8B7FE8]" />
          <h3 className="text-[14px] font-semibold text-[#F4F3EF]">
            Documentation Updates
          </h3>
        </div>

        {/* Stats Grid */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: "Tasks Extracted", value: tasksExtracted, total: 8 },
            { label: "Docs Updated", value: docsUpdated, total: 5 },
            { label: "Sync Status", value: syncProgress === 100 ? "Complete" : "Syncing" },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + (index * 0.1) }}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
            >
              <p className="text-[11px] text-[#55575F]">{stat.label}</p>
              <p className="mt-1 text-[14px] font-semibold text-[#F4F3EF]">
                {typeof stat.value === "number" ? `${stat.value}/${stat.total}` : stat.value}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Updated Documents */}
        <div className="space-y-2">
          <h4 className="text-[12px] font-semibold text-[#F4F3EF]">
            Recently Updated
          </h4>
          {[
            { name: "API Documentation", time: "2 min ago", icon: FileText },
            { name: "Architecture Notes", time: "3 min ago", icon: BookOpen },
            { name: "Authentication Guide", time: "4 min ago", icon: FileText },
            { name: "Rate Limiting Specs", time: "5 min ago", icon: FileText },
            { name: "Deployment Guide", time: "6 min ago", icon: BookOpen },
          ].map((doc, index) => {
            const Icon = doc.icon;
            return (
              <motion.div
                key={doc.name}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + (index * 0.15) }}
                className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
              >
                <Icon className="h-4 w-4 text-[#22A67D]" />
                <div className="flex-1">
                  <p className="text-[12px] text-[#F4F3EF]">{doc.name}</p>
                  <p className="text-[10px] text-[#55575F]">{doc.time}</p>
                </div>
                <CheckCircle2 className="h-3.5 w-3.5 text-[#22A67D]" />
              </motion.div>
            );
          })}
        </div>

        {/* Architecture Sync */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="mt-6 rounded-xl border border-[#22A67D]/20 bg-[#22A67D]/5 p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-[#22A67D]" />
            <span className="text-[12px] font-semibold text-[#22A67D]">
              Architecture Synchronized
            </span>
          </div>
          <p className="text-[11px] text-[#94969E]">
            Architecture notes have been automatically updated to reflect the new rate limiting
            implementation and Redis integration.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
