
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GitPullRequest,
  MessagesSquare,
  Mic,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ListTodo,
  Bug,
  Layers,
  Rocket,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { FaGithub } from "react-icons/fa";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { toggleTask } from "../store/slices/tasksSlice";
import type { Task } from "../store/types";
import { use, useEffect } from "react";
import { fetchDailyDigest } from "../services/dashboard";

const SOURCE_ICON: Record<Task["source"], React.ReactNode> = {
  github: <FaGithub className="h-3.5 w-3.5" />,
  jira: <span className="text-[10px] font-bold">J</span>,
  ai: <span className="text-[10px]">✦</span>,
};

const PRIORITY_DOT: Record<NonNullable<Task["priority"]>, string> = {
  high: "bg-[#E0685F]",
  medium: "bg-[#8B7FE8]",
  low: "bg-[#22A67D]",
};

function TaskRow({ task }: { task: Task }) {
  const dispatch = useAppDispatch();
  const done = task.status === "done";

  return (
    <button
      onClick={() => dispatch(toggleTask(task.id))}
      className="flex w-full items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
    >
      {done ? (
        <CheckCircle2 className="h-[18px] w-[18px] flex-shrink-0 text-[#22A67D]" />
      ) : (
        <Circle className="h-[18px] w-[18px] flex-shrink-0 text-[#55575F]" />
      )}
      {task.priority && !done && (
        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} />
      )}
      <span
        className={`flex-1 text-[13.5px] ${
          done ? "text-[#55575F] line-through" : "text-[#F4F3EF]"
        }`}
      >
        {task.title}
      </span>
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.05] text-[#94969E]">
        {SOURCE_ICON[task.source]}
      </span>
    </button>
  );
}

function QuickAction({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="group flex flex-col rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-white/[0.16] hover:bg-white/[0.04]"
    >
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
        <Icon className="h-4 w-4 text-[#22A67D]" />
      </div>
      <h3 className="mb-1 text-[14px] font-medium text-[#F4F3EF]">{title}</h3>
      <p className="text-[12.5px] leading-relaxed text-[#94969E]">{description}</p>
    </Link>
  );
}

export default function Dashboard() {
  const user = useAppSelector((s) => s.auth.user);
  const taskState=useAppSelector((s)=>s.tasks)
  const tasks = useAppSelector((s) => s.tasks.tasks);
  const projects = useAppSelector((s) => s.projects.projects);
  const currentProjectId = useAppSelector((s) => s.projects.currentProjectId);
  const currentProject = projects.find((p) => p.id === currentProjectId);

  const openTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");
  const firstName = user?.name?.split(" ")[0] ?? "there";


  const dispatch=useAppDispatch()


  const loadDailyDigest=async()=>{
    await dispatch(fetchDailyDigest({
      githubAccessToken:user?.githubToken || "",
      repoId:currentProjectId || ""
    }))


  }

  useEffect(()=>{
    loadDailyDigest()

  },[currentProjectId])


  return (
    <AppShell title="Dashboard">
      <div className="mx-auto max-w-4xl space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <h2 className="text-[24px] font-medium tracking-tight text-[#F4F3EF]">
            Good morning, {firstName}
          </h2>
          <p className="mt-1 text-[13.5px] text-[#94969E]">
            {currentProject?.name} · {currentProject?.repo}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-2xl border border-[#8B7FE8]/20 bg-gradient-to-br from-[#8B7FE8]/[0.06] to-[#22A67D]/[0.04] p-6"
        >
          <div className="mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22A67D]" />
            <span className="font-mono text-[11px] uppercase tracking-wide text-[#22A67D]">
              AI daily digest
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[12px] font-medium text-[#94969E]">Yesterday</p>
              <p className="text-[13.5px] leading-relaxed text-[#F4F3EF]">
               {
                taskState.yesterday
               }
              </p>
            </div>
            <div className="rounded-lg border border-[#E0685F]/20 bg-[#E0685F]/[0.06] p-3">
              <div className="mb-1 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-[#E0685F]" />
                <p className="text-[12px] font-medium text-[#E0685F]">Today's prediction</p>
              </div>
              <p className="text-[13.5px] leading-relaxed text-[#F4F3EF]">
               {
                taskState.prediction
               }
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <QuickAction
            icon={MessagesSquare}
            title="Ask about your repo"
            description="Chat with an agent that knows your entire codebase."
            href="/chat"
          />
          <QuickAction
            icon={GitPullRequest}
            title="Review open PRs"
            description="2 pull requests are waiting on the review agent."
            href="/reviews"
          />
          <QuickAction
            icon={Mic}
            title="Upload a meeting"
            description="Turn a recording into minutes and tickets."
            href="/meetings"
          />
          <QuickAction
            icon={ListTodo}
            title="Task planner"
            description="Unified board for GitHub, Jira, and AI tasks."
            href="/planner"
          />
          <QuickAction
            icon={Bug}
            title="Debug stack traces"
            description="Paste an error, get root cause and fix."
            href="/bugs"
          />
          <QuickAction
            icon={Layers}
            title="Architecture"
            description="Generate system design from a product description."
            href="/architecture"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[14px] font-medium text-[#F4F3EF]">Today's tasks</h3>
            <Link to="/planner" className="text-[12px] text-[#22A67D] hover:underline">
              View planner →
            </Link>
          </div>
          <div className="mb-2 flex items-center gap-2 text-[12px] text-[#55575F]">
            <span>{openTasks.length} open</span>
            <span>·</span>
            <span>{doneTasks.length} done</span>
          </div>
          <div className="space-y-2">
            {tasks.slice(0, 5).map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
        >
          <div className="mb-3 flex items-center gap-2">
            <Rocket className="h-4 w-4 text-[#22A67D]" />
            <h3 className="text-[14px] font-medium text-[#F4F3EF]">Projects</h3>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {projects.map((p) => (
              <div
                key={p.id}
                className={`rounded-xl border px-4 py-3 ${
                  p.id === currentProjectId
                    ? "border-[#8B7FE8]/30 bg-[#8B7FE8]/[0.06]"
                    : "border-white/[0.08] bg-white/[0.02]"
                }`}
              >
                <p className="text-[13.5px] font-medium text-[#F4F3EF]">{p.name}</p>
                <p className="text-[12px] text-[#55575F]">
                  {p.repo} · {p.openTasks} tasks · {p.lastActivity}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
