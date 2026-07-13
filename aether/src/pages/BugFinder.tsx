import { motion } from "framer-motion";
import { Bug, AlertTriangle, Wrench, Loader2, Search } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setStackTraceInput, setAnalyzing, addReport } from "../store/slices/bugsSlice";
import type { BugReport } from "../store/types";

const SEVERITY_STYLES: Record<BugReport["severity"], string> = {
  critical: "bg-[#E0685F]/15 text-[#E0685F] border-[#E0685F]/30",
  high: "bg-[#E0685F]/10 text-[#E0685F] border-[#E0685F]/20",
  medium: "bg-[#8B7FE8]/15 text-[#8B7FE8] border-[#8B7FE8]/30",
  low: "bg-[#94969E]/15 text-[#94969E] border-[#94969E]/30",
};

export default function BugFinder() {
  const dispatch = useAppDispatch();
  const { reports, stackTraceInput, isAnalyzing } = useAppSelector((s) => s.bugs);

  const handleAnalyze = () => {
    if (!stackTraceInput.trim()) return;
    dispatch(setAnalyzing(true));
    setTimeout(() => {
      dispatch(
        addReport({
          id: `b-${Date.now()}`,
          title: "Runtime error detected",
          severity: "high",
          stackTrace: stackTraceInput,
          rootCause: "Component rendered outside required provider context in the route tree.",
          fix: "Wrap the affected route inside the appropriate Provider component.",
        })
      );
      dispatch(setAnalyzing(false));
      dispatch(setStackTraceInput(""));
    }, 1800);
  };

  return (
    <AppShell title="Bug finder">
      <div className="mx-auto max-w-4xl space-y-8">
        <PageSection
          label="Debugging agent"
          title="Paste a stack trace, get a fix"
          description="AI analyzes error traces against your codebase index to find root cause and suggest fixes."
        />

        <GlassCard highlight>
          <label className="mb-2 block font-mono text-[11px] uppercase tracking-wide text-[#22A67D]">
            Stack trace
          </label>
          <textarea
            value={stackTraceInput}
            onChange={(e) => dispatch(setStackTraceInput(e.target.value))}
            placeholder={"Error: useAuth must be used within AuthProvider\n  at useAuth (auth.tsx:24)\n  at Dashboard (Dashboard.tsx:18)"}
            rows={6}
            className="mb-3 w-full resize-none rounded-lg border border-white/[0.08] bg-[#0A0B0D]/50 p-4 font-mono text-[12.5px] leading-relaxed text-[#F4F3EF] placeholder:text-[#55575F] outline-none focus:border-[#8B7FE8]/40"
          />
          <Button
            variant="primary"
            onClick={handleAnalyze}
            disabled={!stackTraceInput.trim() || isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing trace...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Find root cause
              </>
            )}
          </Button>
        </GlassCard>

        <PageSection label="Recent analyses" delay={0.1}>
          <div className="space-y-4">
            {reports.map((report, i) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <GlassCard>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Bug className="h-4 w-4 text-[#E0685F]" />
                      <h3 className="text-[14px] font-medium text-[#F4F3EF]">{report.title}</h3>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase ${SEVERITY_STYLES[report.severity]}`}
                    >
                      {report.severity}
                    </span>
                  </div>

                  <pre className="mb-4 overflow-x-auto rounded-lg border border-white/[0.06] bg-[#0A0B0D]/50 p-3 font-mono text-[11px] text-[#94969E]">
                    {report.stackTrace}
                  </pre>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-[#E0685F]/20 bg-[#E0685F]/[0.06] p-3">
                      <div className="mb-1 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-[#E0685F]" />
                        <span className="text-[12px] font-medium text-[#E0685F]">Root cause</span>
                      </div>
                      <p className="text-[13px] text-[#F4F3EF]">{report.rootCause}</p>
                    </div>
                    <div className="rounded-lg border border-[#22A67D]/20 bg-[#22A67D]/[0.06] p-3">
                      <div className="mb-1 flex items-center gap-1.5">
                        <Wrench className="h-3.5 w-3.5 text-[#22A67D]" />
                        <span className="text-[12px] font-medium text-[#22A67D]">Suggested fix</span>
                      </div>
                      <p className="text-[13px] text-[#F4F3EF]">{report.fix}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </PageSection>
      </div>
    </AppShell>
  );
}
