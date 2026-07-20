import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Filter,
  Calendar,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { toggleTask, addTask, updateTaskStatus, clearTasksError} from "../store/slices/tasksSlice";

import { TaskBoardSkeleton } from "../components/ui/Skeleton";
import { updateTaskStatusRemote, createTaskRemote, toggleTaskRemote,type Task  } from "../services/taskplanner";

// GitHub's webhook is what makes this "real-time" — the moment an issue changes
// on GitHub, the backend writes it to Mongo immediately. The frontend doesn't
// need a persistent connection for that; it just needs to ask again often enough.
const POLL_INTERVAL_MS = 15_000;

const SOURCE_ICON: Record<Task["source"], React.ReactNode> = {
  github: <FaGithub className="h-3.5 w-3.5" />,
  jira: <span className="text-[10px] font-bold">J</span>,
  ai: <span className="text-[10px]">✦</span>,
};

const PRIORITY_COLORS: Record<NonNullable<Task["priority"]>, string> = {
  high: "text-[#E0685F]",
  medium: "text-[#8B7FE8]",
  low: "text-[#94969E]",
};

const STATUS_COLUMNS: { key: Task["status"]; label: string }[] = [
  { key: "open", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

function TaskCard({ task }: { task: Task }) {
  const dispatch = useAppDispatch();

  const handleStatusChange = (status: Task["status"]) => {
    dispatch(updateTaskStatus({ id: task.id, status })); // optimistic
    dispatch(updateTaskStatusRemote({ id: task.id, status })); // reconciles with server + pushes to GitHub
  };

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-[13px] text-[#F4F3EF]">{task.title}</p>
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[#94969E]">
          {SOURCE_ICON[task.source]}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {task.priority && (
          <span className={`text-[10px] font-mono uppercase ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </span>
        )}
        {task.dueDate && (
          <span className="flex items-center gap-1 text-[10px] text-[#55575F]">
            <Calendar className="h-3 w-3" />
            {task.dueDate}
          </span>
        )}
        {task.source === "github" && task.githubIssueUrl && (
          <a
            href={task.githubIssueUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-[#55575F] underline hover:text-[#94969E]"
          >
            #{task.githubIssueNumber}
          </a>
        )}
      </div>
      <div className="mt-2 flex gap-1">
        {STATUS_COLUMNS.map((col) => (
          <button
            key={col.key}
            onClick={() => handleStatusChange(col.key)}
            className={`rounded px-2 py-0.5 text-[10px] transition-colors ${
              task.status === col.key
                ? "bg-[#8B7FE8]/20 text-[#8B7FE8]"
                : "text-[#55575F] hover:text-[#94969E]"
            }`}
          >
            {col.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TaskPlanner() {
  const dispatch = useAppDispatch();
  const { tasks, yesterday, prediction, loading, error } = useAppSelector((s) => s.tasks);

  // Initial load, then keep the board fresh against whatever GitHub's webhook
  // has already written to the backend: a background poll, plus an immediate
  // refetch whenever the tab regains focus (the common case — user tabs back
  // in right after updating an issue on GitHub).
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  

  const openCount = tasks.filter((t) => t.status === "open").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  const currentProjectId = useAppSelector((s) => s.projects.currentRepoId);

  

  const handleAddTask = () => {
    const newTask: Task = {
      id: `t-${Date.now()}`,
      title: "New task",
      status: "open",
      source: "ai",
      priority: "medium",
      projectId: currentProjectId as string,
      syncToGithub: true
      
    };
    dispatch(addTask(newTask)); // optimistic
    dispatch(createTaskRemote(newTask));
  };

  const handleToggle = (id: string) => {
    dispatch(toggleTask(id)); // optimistic
    dispatch(toggleTaskRemote(id));
  };

  return (
    <AppShell title="Task planner">
      <div className="mx-auto max-w-5xl space-y-8">
        <PageSection
          label="Sprint planning"
          title="Unified task board"
          description="Tasks from GitHub, Jira, and AI suggestions — synced live, in one planner."
        />

        {error && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-[#E0685F]/30 bg-[#E0685F]/10 px-4 py-3">
            <div className="flex items-center gap-2 text-[13px] text-[#E0685F]">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
            <button
              onClick={() => {
                dispatch(clearTasksError());
              }}
              className="whitespace-nowrap text-[12px] text-[#E0685F] underline hover:opacity-80"
            >
              Retry
            </button>
          </div>
        )}

        {(yesterday || prediction) && !loading && (
          <GlassCard>
            <div className="mb-2 flex items-center gap-2 text-[13px] font-medium text-[#F4F3EF]">
              <Sparkles className="h-3.5 w-3.5 text-[#8B7FE8]" />
              AI insights
            </div>
            {yesterday && <p className="text-[12px] text-[#94969E]">Yesterday: {yesterday}</p>}
            {prediction && (
              <p className="mt-1 text-[12px] text-[#94969E]">Today's outlook: {prediction}</p>
            )}
          </GlassCard>
        )}

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "To do", count: openCount, icon: Circle, color: "#94969E" },
            { label: "In progress", count: inProgressCount, icon: Clock, color: "#8B7FE8" },
            { label: "Done", count: doneCount, icon: CheckCircle2, color: "#22A67D" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <GlassCard className="flex items-center gap-3">
                <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                <div>
                  <p className="text-[20px] font-medium text-[#F4F3EF]">
                    {loading ? "–" : stat.count}
                  </p>
                  <p className="text-[12px] text-[#55575F]">{stat.label}</p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <Button size="sm">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </Button>
          <Button size="sm" variant="primary" onClick={handleAddTask} disabled={loading}>
            <Plus className="h-3.5 w-3.5" />
            Add task
          </Button>
        </div>

        {loading ? (
          <TaskBoardSkeleton />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {STATUS_COLUMNS.map((col, colIdx) => {
              const columnTasks = tasks.filter((t) => t.status === col.key);
              return (
                <motion.div
                  key={col.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + colIdx * 0.05 }}
                >
                  <h3 className="mb-3 text-[13px] font-medium text-[#94969E]">
                    {col.label} <span className="text-[#55575F]">({columnTasks.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {columnTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                    {columnTasks.length === 0 && (
                      <p className="py-8 text-center text-[12px] text-[#55575F]">No tasks</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {!loading && (
          <GlassCard>
            <h3 className="mb-3 text-[13px] font-medium text-[#F4F3EF]">Quick complete</h3>
            <div className="space-y-2">
              {tasks
                .filter((t) => t.status !== "done")
                .slice(0, 3)
                .map((task) => (
                  <button
                    key={task.id}
                    onClick={() => handleToggle(task.id)}
                    className="flex w-full items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    <Circle className="h-4 w-4 text-[#55575F]" />
                    <span className="text-[13px] text-[#F4F3EF]">{task.title}</span>
                  </button>
                ))}
            </div>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}