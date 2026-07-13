import { motion } from "framer-motion";
import { FileText, BookOpen, GitBranch, Workflow, Loader2, RefreshCw } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setGenerating, setScanProgress } from "../store/slices/docsSlice";
import type { GeneratedDoc } from "../store/types";

const DOC_ICONS: Record<GeneratedDoc["type"], React.ComponentType<{ className?: string }>> = {
  readme: BookOpen,
  api: FileText,
  architecture: GitBranch,
  flow: Workflow,
};

export default function DocsGenerator() {
  const dispatch = useAppDispatch();
  const { documents, isGenerating, scanProgress } = useAppSelector((s) => s.docs);
  const currentProject = useAppSelector((s) =>
    s.projects.projects.find((p) => p.id === s.projects.currentProjectId)
  );

  const handleGenerate = () => {
    dispatch(setGenerating(true));
    dispatch(setScanProgress(0));
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      dispatch(setScanProgress(progress));
      if (progress >= 100) {
        clearInterval(interval);
        dispatch(setGenerating(false));
      }
    }, 400);
  };

  return (
    <AppShell title="Documentation generator">
      <div className="mx-auto max-w-5xl space-y-8">
        <PageSection
          label="AI documentation"
          title="Auto-generate project docs"
          description={`Scanning ${currentProject?.repo} — README, API reference, architecture docs, and flow diagrams.`}
        />

        <GlassCard highlight>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[14px] font-medium text-[#F4F3EF]">Project scan</p>
              <p className="text-[12.5px] text-[#94969E]">
                {isGenerating ? "Analyzing codebase structure..." : "Last scan complete"}
              </p>
            </div>
            <Button variant="primary" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scanning {scanProgress}%
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Regenerate all
                </>
              )}
            </Button>
          </div>
          {isGenerating && (
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#8B7FE8] to-[#22A67D]"
                animate={{ width: `${scanProgress}%` }}
              />
            </div>
          )}
        </GlassCard>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {documents.map((doc, i) => {
            const Icon = DOC_ICONS[doc.type];
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <GlassCard className="flex h-full flex-col">
                  <div className="mb-3 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-[#22A67D]" />
                    <h3 className="text-[14px] font-medium text-[#F4F3EF]">{doc.title}</h3>
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-mono uppercase ${
                        doc.status === "ready"
                          ? "bg-[#22A67D]/15 text-[#22A67D]"
                          : "bg-[#8B7FE8]/15 text-[#8B7FE8]"
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>
                  <pre className="flex-1 overflow-hidden rounded-lg border border-white/[0.06] bg-[#0A0B0D]/50 p-3 font-mono text-[11.5px] leading-relaxed text-[#94969E]">
                    {doc.preview.slice(0, 200)}
                    {doc.preview.length > 200 && "..."}
                  </pre>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" className="flex-1">
                      Preview
                    </Button>
                    <Button size="sm" variant="primary" className="flex-1">
                      Export
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
