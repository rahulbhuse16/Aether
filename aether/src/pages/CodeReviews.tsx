import { motion } from "framer-motion";
import {
  GitPullRequest,
  Bug,
  Gauge,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectPr, setAnalyzing, markReviewed } from "../store/slices/reviewsSlice";
import type { ReviewFinding } from "../store/types";

const CATEGORY_CONFIG: Record<
  ReviewFinding["category"],
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  bug: { icon: Bug, color: "#E0685F", label: "Bug" },
  performance: { icon: Gauge, color: "#8B7FE8", label: "Performance" },
  security: { icon: Shield, color: "#E0685F", label: "Security" },
  style: { icon: AlertCircle, color: "#94969E", label: "Style" },
};

function FindingCard({ finding }: { finding: ReviewFinding }) {
  const config = CATEGORY_CONFIG[finding.category];
  const Icon = config.icon;

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4" color={config.color} />
        <span className="font-mono text-[11px] uppercase tracking-wide" style={{ color: config.color }}>
          {config.label}
        </span>
        <span className="text-[11px] text-[#55575F]">Line {finding.line}</span>
      </div>
      <p className="mb-2 text-[13.5px] text-[#F4F3EF]">{finding.message}</p>
      <p className="rounded-md border border-[#22A67D]/20 bg-[#22A67D]/[0.06] px-3 py-2 text-[12.5px] text-[#22A67D]">
        {finding.suggestion}
      </p>
    </div>
  );
}

export default function CodeReviews() {
  const dispatch = useAppDispatch();
  const { pullRequests, selectedPrId, isAnalyzing } = useAppSelector((s) => s.reviews);
  const selectedPr = pullRequests.find((p) => p.id === selectedPrId);

  const handleAnalyze = (prId: string) => {
    dispatch(selectPr(prId));
    dispatch(setAnalyzing(true));
    setTimeout(() => {
      dispatch(setAnalyzing(false));
      dispatch(markReviewed(prId));
    }, 2000);
  };

  return (
    <AppShell title="Code review agent">
      <div className="mx-auto max-w-5xl space-y-8">
        <PageSection
          label="Pull requests"
          title="AI-powered code review"
          description="Drop a PR link or select from open pull requests. The agent finds bugs, performance issues, and security vulnerabilities."
          delay={0}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-2 lg:col-span-2"
          >
            {pullRequests.map((pr) => (
              <button
                key={pr.id}
                onClick={() => dispatch(selectPr(pr.id))}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                  pr.id === selectedPrId
                    ? "border-[#8B7FE8]/30 bg-[#8B7FE8]/[0.06]"
                    : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16]"
                }`}
              >
                <GitPullRequest className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#22A67D]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] text-[#94969E]">#{pr.number}</span>
                    {pr.reviewed && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#22A67D]" />
                    )}
                  </div>
                  <p className="truncate text-[13.5px] font-medium text-[#F4F3EF]">{pr.title}</p>
                  <p className="text-[12px] text-[#55575F]">by {pr.author}</p>
                </div>
              </button>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3"
          >
            {selectedPr ? (
              <GlassCard highlight className="space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[12px] text-[#94969E]">
                      PR #{selectedPr.number}
                    </span>
                    <h3 className="text-[16px] font-medium text-[#F4F3EF]">{selectedPr.title}</h3>
                  </div>
                  {!selectedPr.reviewed && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAnalyze(selectedPr.id)}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        "Run review"
                      )}
                    </Button>
                  )}
                </div>

                {selectedPr.findings && selectedPr.findings.length > 0 ? (
                  <>
                    <div className="flex items-center gap-2 rounded-lg border border-[#E0685F]/20 bg-[#E0685F]/[0.06] px-3 py-2">
                      <AlertCircle className="h-4 w-4 text-[#E0685F]" />
                      <span className="text-[13px] text-[#F4F3EF]">
                        {selectedPr.findings.length} potential issues found
                      </span>
                    </div>
                    <div className="space-y-3">
                      {selectedPr.findings.map((f) => (
                        <FindingCard key={f.id} finding={f} />
                      ))}
                    </div>
                    <Button variant="primary" className="w-full">
                      Create fix PR
                    </Button>
                  </>
                ) : (
                  <p className="text-[13px] text-[#94969E]">
                    {isAnalyzing
                      ? "Scanning diff for bugs, performance, and security issues..."
                      : "Click Run review to analyze this pull request."}
                  </p>
                )}
              </GlassCard>
            ) : (
              <GlassCard>
                <p className="text-[13px] text-[#94969E]">Select a pull request to review.</p>
              </GlassCard>
            )}
          </motion.div>
        </div>
      </div>
    </AppShell>
  );
}
