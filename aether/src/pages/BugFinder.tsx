import { use, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bug,
  AlertTriangle,
  Wrench,
  Loader2,
  Search,
  GitBranch,
  FolderTree,
  ChevronDown,
  ShieldAlert,
  Gauge,
  FileWarning,
  Trash2,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setRepoUrlInput,
  setBranchInput,
  setFocusPathInput,
  setStackTraceInput,
  clearAnalyzeError,
} from "../store/slices/bugsSlice";
import { FaGithub } from "react-icons/fa";
import { type Severity, type BugAnalysisReport, deleteBugReport, fetchBugReports, analyzeRepository } from "../services/bugFinder";


const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "bg-[#E0685F]/15 text-[#E0685F] border-[#E0685F]/30",
  high: "bg-[#E0685F]/10 text-[#E0685F] border-[#E0685F]/20",
  medium: "bg-[#8B7FE8]/15 text-[#8B7FE8] border-[#8B7FE8]/30",
  low: "bg-[#94969E]/15 text-[#94969E] border-[#94969E]/30",
  info: "bg-[#3E9BD6]/15 text-[#3E9BD6] border-[#3E9BD6]/30",
};

function healthColor(score: number): string {
  if (score >= 80) return "#22A67D";
  if (score >= 50) return "#8B7FE8";
  return "#E0685F";
}

function FindingRow({ finding }: { finding: BugAnalysisReport["findings"][number] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#0A0B0D]/40">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Bug className="h-3.5 w-3.5 shrink-0 text-[#E0685F]" />
          <span className="truncate text-[13px] font-medium text-[#F4F3EF]">
            {finding.title}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase ${SEVERITY_STYLES[finding.severity]}`}
          >
            {finding.severity}
          </span>
          <span className="font-mono text-[10px] text-[#55575F]">
            {finding.confidence}%
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-[#55575F] transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-white/[0.06] px-3 py-3">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-[#94969E]">
                <FileWarning className="h-3 w-3" />
                <span>{finding.file}</span>
                {(finding.lineStart || finding.lineEnd) && (
                  <span className="text-[#55575F]">
                    L{finding.lineStart}
                    {finding.lineEnd && finding.lineEnd !== finding.lineStart
                      ? `-${finding.lineEnd}`
                      : ""}
                  </span>
                )}
                <span className="rounded border border-white/[0.08] px-1.5 py-0.5 text-[10px] uppercase text-[#8B7FE8]">
                  {finding.category}
                </span>
              </div>

              <p className="text-[13px] leading-relaxed text-[#F4F3EF]">
                {finding.description}
              </p>

              {finding.codeSnippet && (
                <pre className="overflow-x-auto rounded-lg border border-white/[0.06] bg-[#0A0B0D]/60 p-3 font-mono text-[11px] text-[#94969E]">
                  {finding.codeSnippet}
                </pre>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-[#E0685F]/20 bg-[#E0685F]/[0.06] p-3">
                  <div className="mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-[#E0685F]" />
                    <span className="text-[12px] font-medium text-[#E0685F]">
                      Root cause
                    </span>
                  </div>
                  <p className="text-[13px] text-[#F4F3EF]">{finding.rootCause}</p>
                </div>
                <div className="rounded-lg border border-[#22A67D]/20 bg-[#22A67D]/[0.06] p-3">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-[#22A67D]" />
                    <span className="text-[12px] font-medium text-[#22A67D]">
                      Suggested fix
                    </span>
                  </div>
                  <p className="text-[13px] text-[#F4F3EF]">{finding.fix}</p>
                </div>
              </div>

              {finding.impact && (
                <div className="rounded-lg border border-[#8B7FE8]/20 bg-[#8B7FE8]/[0.06] p-3">
                  <div className="mb-1 flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-[#8B7FE8]" />
                    <span className="text-[12px] font-medium text-[#8B7FE8]">Impact</span>
                  </div>
                  <p className="text-[13px] text-[#F4F3EF]">{finding.impact}</p>
                </div>
              )}

              {finding.relatedFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {finding.relatedFiles.map((rf) => (
                    <span
                      key={rf}
                      className="rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-0.5 font-mono text-[10px] text-[#94969E]"
                    >
                      {rf}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReportCard({ report, index }: { report: BugAnalysisReport; index: number }) {
  const dispatch = useAppDispatch();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index }}
    >
      <GlassCard>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FaGithub className="h-4 w-4 text-[#94969E]" />
              <h3 className="truncate text-[14px] font-medium text-[#F4F3EF]">
                {report.owner}/{report.repoName}
              </h3>
            </div>
            <div className="mt-1 flex items-center gap-2 font-mono text-[11px] text-[#55575F]">
              <GitBranch className="h-3 w-3" />
              {report.branch}
              {report.focusPath && (
                <>
                  <FolderTree className="h-3 w-3" />
                  {report.focusPath}
                </>
              )}
              <span>· {report.filesAnalyzed} files analyzed</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5" style={{ color: healthColor(report.repositoryHealthScore) }} />
              <span
                className="font-mono text-[13px] font-semibold"
                style={{ color: healthColor(report.repositoryHealthScore) }}
              >
                {report.repositoryHealthScore}
              </span>
            </div>
            <button
              onClick={() => dispatch(deleteBugReport(report.id))}
              className="rounded-md p-1.5 text-[#55575F] transition-colors hover:bg-white/[0.06] hover:text-[#E0685F]"
              aria-label="Delete report"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <p className="mb-4 text-[13px] leading-relaxed text-[#94969E]">{report.summary}</p>

        <div className="mb-4 flex flex-wrap gap-2">
          {(["critical", "high", "medium", "low"] as const).map((sev) =>
            report[sev] > 0 ? (
              <span
                key={sev}
                className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase ${SEVERITY_STYLES[sev]}`}
              >
                {report[sev]} {sev}
              </span>
            ) : null
          )}
        </div>

        <div className="space-y-2">
          {report.findings.map((finding, i) => (
            <FindingRow key={finding.id ?? `${report.id}-${i}`} finding={finding} />
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default function BugFinder() {
  const dispatch = useAppDispatch();
  const {
    reports,
    repoUrlInput,
    branchInput,
    focusPathInput,
    stackTraceInput,
    isAnalyzing,
    isLoadingReports,
    analyzeError,
  } = useAppSelector((s) => s.bugs);

  const projects=useAppSelector((s)=>s.projects)

  useEffect(() => {
    dispatch(fetchBugReports());
  }, [dispatch]);

  const handleAnalyze = () => {
    if (isAnalyzing) return;
    dispatch(clearAnalyzeError());
    dispatch(
      analyzeRepository({
        repoId: projects.currentProjectId as string,
        branch: branchInput.trim() || undefined,
        focusPath: focusPathInput.trim() || undefined,
        stackTrace: stackTraceInput.trim() || undefined,
      })
    );
  };

  return (
    <AppShell title="Bug finder">
      <div className="mx-auto max-w-4xl space-y-8">
        <PageSection
          label="Debugging agent"
          title="Point it at a repo, get a findings report"
          description="Aether BugFinder pulls your GitHub repository context and runs an enterprise-grade AI code review across security, performance, architecture, and correctness."
        />

        <GlassCard highlight>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
           

            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-wide text-[#22A67D]">
                Branch <span className="normal-case text-[#55575F]">(optional)</span>
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#0A0B0D]/50 px-3">
                <GitBranch className="h-4 w-4 shrink-0 text-[#55575F]" />
                <input
                  value={branchInput}
                  onChange={(e) => dispatch(setBranchInput(e.target.value))}
                  placeholder="defaults to repo's default branch"
                  className="w-full bg-transparent py-3 font-mono text-[12.5px] text-[#F4F3EF] placeholder:text-[#55575F] outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-wide text-[#22A67D]">
              Focus path <span className="normal-case text-[#55575F]">(optional)</span>
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#0A0B0D]/50 px-3">
              <FolderTree className="h-4 w-4 shrink-0 text-[#55575F]" />
              <input
                value={focusPathInput}
                onChange={(e) => dispatch(setFocusPathInput(e.target.value))}
                placeholder="e.g. src/controllers"
                className="w-full bg-transparent py-3 font-mono text-[12.5px] text-[#F4F3EF] placeholder:text-[#55575F] outline-none"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-wide text-[#22A67D]">
              Stack trace or notes <span className="normal-case text-[#55575F]">(optional)</span>
            </label>
            <textarea
              value={stackTraceInput}
              onChange={(e) => dispatch(setStackTraceInput(e.target.value))}
              placeholder={"Paste an error trace to help prioritize the review, e.g.\nError: useAuth must be used within AuthProvider\n  at useAuth (auth.tsx:24)"}
              rows={4}
              className="w-full resize-none rounded-lg border border-white/[0.08] bg-[#0A0B0D]/50 p-4 font-mono text-[12.5px] leading-relaxed text-[#F4F3EF] placeholder:text-[#55575F] outline-none focus:border-[#8B7FE8]/40"
            />
          </div>

          {analyzeError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#E0685F]/30 bg-[#E0685F]/[0.08] px-3 py-2 text-[12.5px] text-[#E0685F]">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {analyzeError}
            </div>
          )}

          <Button
            variant="primary"
            onClick={handleAnalyze}
            disabled={isAnalyzing || projects.currentProjectId === ""}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing repository...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Run analysis
              </>
            )}
          </Button>
        </GlassCard>

        <PageSection label="Recent analyses" delay={0.1}>
          {isLoadingReports && reports.length === 0 ? (
            <div className="flex items-center gap-2 py-8 text-[13px] text-[#55575F]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading reports...
            </div>
          ) : reports?.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[#55575F]">
              No analyses yet — run one above to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {reports?.map((report, i) => (
                <ReportCard key={report.id} report={report} index={i} />
              ))}
            </div>
          )}
        </PageSection>
      </div>
    </AppShell>
  );
}