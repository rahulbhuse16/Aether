// Path: src/components/AppShell.tsx
//
// Shared authenticated-app layout — sidebar + topbar. Every app page
// wraps its content in this:
//
//   export default function DashboardPage() {
//     return <AppShell title="Dashboard"><DashboardContent /></AppShell>;
//   }

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  LogOut,
  ListTodo,
  Link2,
  Bug,
  Layers,
  Rocket,
  AudioLines,
  Plus,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setCurrentProject, setCurrentRepoId } from "../store/slices/projectsSlice";
import { toggleSidebar } from "../store/slices/uiSlice";
import { Logo } from "./Logo";
import { Notifications } from "./Notifications";
import { fetchUserProjects } from "../services/dashboard";
import { logOut } from "../services/auth";
import { setConnectedRepo } from "../store/slices/deploymentSlice";
import { useSSENotification } from "../hooks/useSSENotification";
import { FaSlack } from "react-icons/fa";

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
  { label: "Slack", href: "/slack", icon: FaSlack },
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
  const navigate = useNavigate();
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);

  const user = useAppSelector((s) => s.auth.user);
  const projectsState = useAppSelector((s) => s.projects);
  const projects = projectsState.projects;
  const currentProjectId = projectsState.currentProjectId;
  const projectsLoading = projectsState.loading;
  const sidebarCollapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const budget = useAppSelector((s) => s.budget);

  const currentProject = projects.find((p) => p.id === currentProjectId);

  const loadProjects = async () => {
    const userId = localStorage.getItem('userId') || ""

    await dispatch(fetchUserProjects(userId))



  }


  useSSENotification()


  useEffect(() => {
    loadProjects()

  }, [])


  const handleLogout=async()=>{
    await logOut()
    navigate("/auth")

  }

  return (
    <div className="flex min-h-screen bg-[#0A0B0D]">
      <motion.aside
        animate={{ width: sidebarCollapsed ? 72 : 240 }}
        transition={{ duration: 0.2 }}
        className="relative flex flex-shrink-0 flex-col border-r border-[#0A0B0D] bg-[#0A0B0D]"
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-white/[0.06] px-4 self-center">
          <Logo size={100} />
          
        </div>

        {/* Project switcher */}
        <div className="relative border-b border-white/[0.06] px-3 py-3">
          {projectsLoading && !currentProject ? (
            sidebarCollapsed ? (
              <div className="flex h-10 w-full items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02]">
                <div className="h-2 w-2 rounded-full bg-[#22A67D]/50 animate-pulse" />
              </div>
            ) : (
              <div className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 animate-pulse">
                <div className="h-3.5 w-24 rounded bg-white/10 mb-1.5" />
                <div className="h-3 w-32 rounded bg-white/5" />
              </div>
            )
          ) : (
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
          )}

          {projectMenuOpen && !sidebarCollapsed && (
            <div className="absolute left-3 right-3 top-[calc(100%-4px)] z-20 overflow-hidden rounded-lg border border-white/[0.08] bg-[#101215] shadow-xl">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    dispatch(setCurrentProject(p.id));
                    dispatch(setCurrentRepoId(p.projectId))
                    setProjectMenuOpen(false);
                    dispatch(setConnectedRepo(p.repo))

                  }}
                  className={`flex w-full flex-col items-start px-3 py-2 text-left transition-colors hover:bg-white/[0.04] ${p.id === currentProjectId ? "bg-white/[0.03]" : ""
                    }`}
                >
                  <span className="text-[13px] text-[#F4F3EF]">{p.name}</span>
                  <span className="text-[11px] text-[#55575F]">{p.repo}</span>
                </button>
              ))}
              <Link
                to="/onboarding"
                state={{ skipConnect: true }}
                onClick={() => setProjectMenuOpen(false)}
                className="flex w-full items-center gap-2 border-t border-white/[0.06] px-3 py-2.5 text-left text-[13px] text-[#94969E] transition-colors hover:bg-white/[0.04] hover:text-[#F4F3EF]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add project
              </Link>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors ${active
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

        {/* User + collapse toggle */}
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
              <button onClick={handleLogout} aria-label="Sign out" className="text-[#55575F] hover:text-[#F4F3EF]">
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

      {/* Main column */}
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

            {/* Self-contained: renders its own bell + unread badge + panel,
                reads/writes notificationsSlice internally. Don't wrap it
                in extra open/close state here — it manages that itself. */}
            <Notifications />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}