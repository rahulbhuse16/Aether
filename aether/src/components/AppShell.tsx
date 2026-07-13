import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  MessagesSquare,
  GitPullRequest,
  FileText,
  Mic,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Bell,
  LogOut,
  ListTodo,
  Link2,
  Bug,
  Layers,
  Rocket,
  AudioLines,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setCurrentProject } from "../store/slices/projectsSlice";
import { toggleSidebar } from "../store/slices/uiSlice";
import { Logo } from "./Logo";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Task planner", href: "/planner", icon: ListTodo },
  { label: "Chat with repo", href: "/chat", icon: MessagesSquare },
  { label: "Code reviews", href: "/reviews", icon: GitPullRequest },
  { label: "API agent", href: "/api-agent", icon: Link2 },
  { label: "Bug finder", href: "/bugs", icon: Bug },
  { label: "Architecture", href: "/architecture", icon: Layers },
  { label: "Documentation", href: "/docs-generator", icon: FileText },
  { label: "Meetings", href: "/meetings", icon: Mic },
  { label: "Deployment", href: "/deployment", icon: Rocket },
  { label: "Voice engineer", href: "/voice", icon: AudioLines },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pathname = useLocation().pathname;
  const dispatch = useAppDispatch();
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);

  const user = useAppSelector((s) => s.auth.user);
  const projects = useAppSelector((s) => s.projects.projects);
  const currentProjectId = useAppSelector((s) => s.projects.currentProjectId);
  const sidebarCollapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const budget = useAppSelector((s) => s.budget);

  const currentProject = projects.find((p) => p.id === currentProjectId);

  return (
    <div className="flex min-h-screen bg-[#0A0B0D]">
      <motion.aside
        animate={{ width: sidebarCollapsed ? 72 : 240 }}
        transition={{ duration: 0.2 }}
        className="relative flex flex-shrink-0 flex-col border-r border-white/[0.06] bg-[#0A0B0D]"
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-white/[0.06] px-4">
          <Logo size={50} />
          {!sidebarCollapsed && (
            <span className="text-[14px] font-medium tracking-tight text-[#F4F3EF]">
              Aether
            </span>
          )}
        </div>

        <div className="relative border-b border-white/[0.06] px-3 py-3">
          <button
            onClick={() => setProjectMenuOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-left transition-colors hover:bg-white/[0.04]"
          >
            {!sidebarCollapsed ? (
              <>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[#F4F3EF]">
                    {currentProject?.name ?? "Select project"}
                  </p>
                  <p className="truncate text-[11px] text-[#55575F]">
                    {currentProject?.repo}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 flex-shrink-0 text-[#55575F]" />
              </>
            ) : (
              <span className="mx-auto h-2 w-2 rounded-full bg-[#22A67D]" />
            )}
          </button>

          {projectMenuOpen && !sidebarCollapsed && (
            <div className="absolute left-3 right-3 top-[calc(100%-4px)] z-20 overflow-hidden rounded-lg border border-white/[0.08] bg-[#101215] shadow-xl">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    dispatch(setCurrentProject(p.id));
                    setProjectMenuOpen(false);
                  }}
                  className={`flex w-full flex-col items-start px-3 py-2 text-left transition-colors hover:bg-white/[0.04] ${
                    p.id === currentProjectId ? "bg-white/[0.03]" : ""
                  }`}
                >
                  <span className="text-[13px] text-[#F4F3EF]">{p.name}</span>
                  <span className="text-[11px] text-[#55575F]">{p.repo}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                  active
                    ? "bg-white/[0.06] text-[#F4F3EF]"
                    : "text-[#94969E] hover:bg-white/[0.03] hover:text-[#F4F3EF]"
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-3">
          {!sidebarCollapsed && (
            <div className="mb-2 flex items-center gap-2.5 rounded-lg px-2 py-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8B7FE8] to-[#22A67D] text-[12px] font-medium text-[#0A0B0D]">
                {user?.name?.[0] ?? "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-[#F4F3EF]">{user?.name}</p>
                <p className="truncate text-[11px] text-[#55575F]">{user?.email}</p>
              </div>
              <button aria-label="Sign out" className="text-[#55575F] hover:text-[#F4F3EF]">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="flex w-full items-center justify-center rounded-lg py-1.5 text-[#55575F] hover:bg-white/[0.03] hover:text-[#94969E]"
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-white/[0.06] px-6">
          <h1 className="text-[16px] font-medium tracking-tight text-[#F4F3EF]">
            {title}
          </h1>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 sm:flex">
              <span className="font-mono text-[11px] text-[#55575F]">AI budget</span>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#8B7FE8] to-[#22A67D]"
                  style={{ width: `${budget.used}%` }}
                />
              </div>
              <span className="font-mono text-[11px] text-[#94969E]">{budget.used}%</span>
            </div>
            <button aria-label="Notifications" className="text-[#94969E] hover:text-[#F4F3EF]">
              <Bell className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
