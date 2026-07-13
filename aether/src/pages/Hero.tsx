
/**
 * Hero — Aether landing page
 *
 * Requires:
 *   npm install framer-motion lucide-react
 *
 * Expects /public/aether_logo.svg (same asset used in AuthPage.tsx).
 *
 * Brand tokens (shared with AuthPage.tsx):
 *   bg base        #0A0B0D
 *   surface        #101215
 *   border         white/8-10%
 *   text primary   #F4F3EF
 *   text secondary #94969E
 *   text muted     #55575F
 *   accent purple  #8B7FE8
 *   accent teal    #22A67D
 */

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Menu,
  X,
  ArrowRight,
  MessagesSquare,
  GitPullRequest,
  FileText,
  Mic,
  Rocket,
  Gauge,
  
  Link2,
  Bot,
  CheckCircle2,
} from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { Logo } from "../components/Logo";

/* ---------------------------------------------------------------- */
/* Shared logo                                                       */
/* ---------------------------------------------------------------- */


/* ---------------------------------------------------------------- */
/* Ambient background — hexagon motif, dot grid, slow drifting glow  */
/* ---------------------------------------------------------------- */

function AmbientBackground() {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0A0B0D]">
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(244,243,239,0.6) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />

      <motion.div
        className="absolute -top-40 left-[8%] h-[420px] w-[420px] rounded-full blur-[110px]"
        style={{ background: "rgba(139,127,232,0.16)" }}
        animate={reduce ? {} : { y: [0, 30, 0], x: [0, 20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[30%] right-[6%] h-[380px] w-[380px] rounded-full blur-[110px]"
        style={{ background: "rgba(34,166,125,0.14)" }}
        animate={reduce ? {} : { y: [0, -26, 0], x: [0, -18, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />

      {/* large faint hexagon, echoes the mark, rotates almost imperceptibly */}
      <motion.svg
        viewBox="0 0 100 100"
        className="absolute left-1/2 top-[18%] h-[640px] w-[640px] -translate-x-1/2 opacity-[0.05]"
        animate={reduce ? {} : { rotate: 360 }}
        transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
      >
        <polygon
          points="50,4 93,27 93,73 50,96 7,73 7,27"
          fill="none"
          stroke="#F4F3EF"
          strokeWidth="0.6"
        />
      </motion.svg>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Navbar                                                             */
/* ---------------------------------------------------------------- */

const NAV_LINKS = [
  { label: "Agents", href: "#agents" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "pricing" },
  { label: "Docs", href: "#" },
];

function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0A0B0D]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="/" className="flex items-center gap-2.5">
          <Logo size={60} />
         
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[14px] text-[#94969E] transition-colors hover:text-[#F4F3EF]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-5 md:flex">
          <a
            href="#"
            className="flex items-center gap-1.5 text-[14px] text-[#94969E] transition-colors hover:text-[#F4F3EF]"
          >
            <FaGithub className="h-4 w-4" />
            GitHub
          </a>
          <a
            href="/signin"
            className="text-[14px] text-[#94969E] transition-colors hover:text-[#F4F3EF]"
          >
            Sign in
          </a>
          <a
            href="/signup"
            className="group flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#8B7FE8] to-[#22A67D] px-4 py-2 text-[13px] font-medium text-[#0A0B0D] transition-all hover:brightness-[1.05]"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>

        <button
          className="text-[#F4F3EF] md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/[0.06] md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="py-2 text-[14px] text-[#94969E] hover:text-[#F4F3EF]"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-white/[0.06] pt-4">
                <a href="/signin" className="py-1 text-[14px] text-[#94969E]">
                  Sign in
                </a>
                <a
                  href="/signup"
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#8B7FE8] to-[#22A67D] py-2.5 text-[14px] font-medium text-[#0A0B0D]"
                >
                  Get started
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ---------------------------------------------------------------- */
/* Hero section                                                      */
/* ---------------------------------------------------------------- */

function HeroSection() {
  const stats = [
    { label: "agents_active", value: "12,480" },
    { label: "prs_reviewed_today", value: "3,204" },
    { label: "uptime", value: "99.98%" },
  ];

  return (
    <section className="relative flex flex-col items-center px-6 pb-24 pt-24 text-center sm:pt-32">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#22A67D]" />
        <span className="font-mono text-[12px] text-[#94969E]">
          AI engineering operating system
        </span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="max-w-3xl text-[42px] font-medium leading-[1.12] tracking-tight text-[#F4F3EF] sm:text-[56px]"
      >
        The AI that ships real{" "}
        <span className="bg-gradient-to-r from-[#8B7FE8] to-[#22A67D] bg-clip-text text-transparent">
          engineering work
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-6 max-w-xl text-[17px] leading-relaxed text-[#94969E]"
      >
        Aether reviews pull requests, understands your entire repository, and
        turns AI suggestions into merges, tickets, and docs — inside one
        workspace connected to the tools your team already uses.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
      >
        <a
          href="/signup"
          className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8B7FE8] to-[#22A67D] px-6 py-3 text-[14px] font-medium text-[#0A0B0D] shadow-lg shadow-[#8B7FE8]/10 transition-all hover:brightness-[1.05]"
        >
          Start building — it's free
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </a>
        <a
          href="#agents"
          className="flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.02] px-6 py-3 text-[14px] font-medium text-[#F4F3EF] transition-colors hover:bg-white/[0.05]"
        >
          See it in action
        </a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.45 }}
        className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 font-mono text-[12px] text-[#55575F]"
      >
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="text-[#22A67D]">&rsaquo;</span>
            {s.label}: <span className="text-[#94969E]">{s.value}</span>
          </div>
        ))}
      </motion.div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Agents / features grid                                            */
/* ---------------------------------------------------------------- */

const AGENTS = [
  {
    icon: MessagesSquare,
    title: "Chat with your repository",
    description:
      "Ask where anything lives or how it works. Aether holds real, cited context on your entire codebase.",
    flagship: true,
  },
  {
    icon: GitPullRequest,
    title: "Code review agent",
    description:
      "Runs on every PR — flags bugs, performance issues, and security risks as inline review comments.",
  },
  {
    icon: FileText,
    title: "Documentation generator",
    description:
      "Scans your repo and keeps README, architecture docs, and diagrams in sync automatically.",
  },
  {
    icon: Mic,
    title: "Meeting agent",
    description:
      "Upload a recording — get minutes, action items, and tickets created directly in your tracker.",
  },
  {
    icon: Rocket,
    title: "Deployment agent",
    description:
      "Generates Dockerfiles, CI pipelines, and IaC from real repo analysis, not boilerplate guesses.",
  },
  {
    icon: Gauge,
    title: "Cost governor",
    description:
      "Live AI spend tracking per project and agent, with budgets and alerts — no surprise bills.",
  },
];

function AgentCard({
  icon: Icon,
  title,
  description,
  flagship,
  index,
}: (typeof AGENTS)[number] & { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay: (index % 3) * 0.08 }}
      className={`group relative rounded-2xl border p-6 transition-colors ${
        flagship
          ? "border-[#8B7FE8]/30 bg-gradient-to-br from-[#8B7FE8]/[0.06] to-[#22A67D]/[0.04]"
          : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14]"
      }`}
    >
      {flagship && (
        <span className="absolute right-5 top-5 rounded-full border border-[#8B7FE8]/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#8B7FE8]">
          Flagship
        </span>
      )}
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
        <Icon className="h-5 w-5 text-[#22A67D]" />
      </div>
      <h3 className="mb-2 text-[15px] font-medium text-[#F4F3EF]">{title}</h3>
      <p className="text-[13.5px] leading-relaxed text-[#94969E]">
        {description}
      </p>
    </motion.div>
  );
}

function AgentsSection() {
  return (
    <section id="agents" className="relative px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-14 max-w-xl text-center">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[#22A67D]">
            Core agents
          </span>
          <h2 className="mt-3 text-[30px] font-medium tracking-tight text-[#F4F3EF] sm:text-[36px]">
            Specialized agents for real engineering work
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[#94969E]">
            Not one chatbot trying to do everything — a set of narrow agents,
            each producing something you can actually merge.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AGENTS.map((agent, i) => (
            <AgentCard key={agent.title} {...agent} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* How it works                                                      */
/* ---------------------------------------------------------------- */

const STEPS = [
  {
    icon: Link2,
    title: "Connect your repo",
    description: "Sign in with GitHub and point Aether at a repository. Indexing takes a couple of minutes.",
  },
  {
    icon: Bot,
    title: "Agents get to work",
    description: "Chat, code review, and documentation agents run automatically, using real context from your codebase.",
  },
  {
    icon: CheckCircle2,
    title: "Review and merge",
    description: "Every suggestion ships as a diff, doc, or ticket you approve — nothing touches your repo without sign-off.",
  },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-16 max-w-xl text-center">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[#8B7FE8]">
            How it works
          </span>
          <h2 className="mt-3 text-[30px] font-medium tracking-tight text-[#F4F3EF] sm:text-[36px]">
            From repo to merged in three steps
          </h2>
        </div>

        <div className="relative grid grid-cols-1 gap-10 sm:grid-cols-3">
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent sm:block" />
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.12 }}
              className="relative flex flex-col items-center text-center"
            >
              <div className="relative z-10 mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.1] bg-[#0A0B0D]">
                <step.icon className="h-5 w-5 text-[#22A67D]" />
              </div>
              <h3 className="mb-2 text-[15px] font-medium text-[#F4F3EF]">
                {step.title}
              </h3>
              <p className="max-w-xs text-[13.5px] leading-relaxed text-[#94969E]">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* CTA band                                                           */
/* ---------------------------------------------------------------- */

function CTASection() {
  return (
    <section className="relative px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="relative rounded-2xl bg-gradient-to-br from-[#8B7FE8]/25 via-white/[0.06] to-[#22A67D]/25 p-px">
          <div className="flex flex-col items-center rounded-[15px] bg-[#101215]/95 px-8 py-14 text-center backdrop-blur-xl">
            <Logo size={44} />
            <h2 className="mt-6 max-w-lg text-[28px] font-medium tracking-tight text-[#F4F3EF] sm:text-[32px]">
              Ready to ship faster with Aether?
            </h2>
            <p className="mt-3 max-w-md text-[15px] text-[#94969E]">
              Free to start. Connect a repo and see a real review in minutes.
            </p>
            <a
              href="/signup"
              className="group mt-8 flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#8B7FE8] to-[#22A67D] px-6 py-3 text-[14px] font-medium text-[#0A0B0D] transition-all hover:brightness-[1.05]"
            >
              Start building — it's free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Footer                                                             */
/* ---------------------------------------------------------------- */

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: ["Agents", "Pricing", "Changelog", "Docs"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "Careers"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms", "Security"],
  },
];

function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] px-6 py-14">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 sm:flex-row sm:justify-between">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            <Logo size={22} />
            <span className="text-[14px] font-medium text-[#F4F3EF]">Aether</span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-[#55575F]">
            The AI engineering operating system — one workspace where AI does
            real engineering work.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-[12px] font-medium uppercase tracking-wide text-[#55575F]">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-[13px] text-[#94969E] transition-colors hover:text-[#F4F3EF]"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-[12px] text-[#55575F] sm:flex-row">
        <span>© {new Date().getFullYear()} Aether. All rights reserved.</span>
        <span className="font-mono text-[11px]">status: all systems operational</span>
      </div>
    </footer>
  );
}

/* ---------------------------------------------------------------- */
/* Page                                                               */
/* ---------------------------------------------------------------- */

export default function Hero() {
  return (
    <div className="relative min-h-screen bg-[#0A0B0D]">
      <AmbientBackground />
      <Navbar />
      <main>
        <HeroSection />
        <AgentsSection />
        <HowItWorksSection />
        <CTASection />
      </main>
      
    </div>
  );
}