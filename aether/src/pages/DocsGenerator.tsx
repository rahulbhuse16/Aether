import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, BookOpen, GitBranch, Workflow, Loader2, RefreshCw, AlertTriangle, X } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setScanProgress, clearDocsError } from "../store/slices/docsSlice";
import { generateDocs, regenerateDoc, fetchLatestDocsSession,type GeneratedDoc } from "../services/documentation";

const DOC_ICONS: Record<GeneratedDoc["type"], React.ComponentType<{ className?: string }>> = {
  readme: BookOpen,
  api: FileText,
  architecture: GitBranch,
  flow: Workflow,
};

const DOC_EXTENSIONS: Record<GeneratedDoc["type"], string> = {
  readme: "md",
  api: "md",
  architecture: "md",
  flow: "md",
};

export default function DocsGenerator() {
  const dispatch = useAppDispatch();
  const { documents, isGenerating, isRegeneratingType, scanProgress,branch, error } = useAppSelector(
    (s) => s.docs
  );
  const repoId = useAppSelector((s) => s.projects.currentProjectId);
  const currentProject = useAppSelector((s) =>
    s.projects.projects.find((p) => p.id === s.projects.currentProjectId)
  );
  const [previewId, setPreviewId] = useState<string | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (repoId) {
      dispatch(fetchLatestDocsSession({ repoId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoId]);

  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  const handleGenerate = () => {
    if (!repoId || isGenerating) return;
    dispatch(clearDocsError());
    dispatch(setScanProgress(0));

    // Real generation is a single request/response — this simulates a scan
    // progress bar in the meantime so the wait doesn't feel dead, and caps
    // at 90% until the actual response lands.
    let progress = 0;
    progressInterval.current = setInterval(() => {
      progress = Math.min(progress + 15, 90);
      dispatch(setScanProgress(progress));
    }, 400);

    dispatch(generateDocs({ repoId, branch: branch || undefined })).finally(() => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    });
  };

  const handleRegenerate = (type: GeneratedDoc["type"]) => {
    if (!repoId || isRegeneratingType) return;
    dispatch(clearDocsError());
    dispatch(regenerateDoc({ repoId, branch: branch || undefined, type }));
  };

  const handleExport = (doc: GeneratedDoc) => {
    const content = doc.content || doc.preview;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title.replace(/[^a-z0-9.-]/gi, "_")}.${DOC_EXTENSIONS[doc.type]}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const previewDoc = documents.find((d) => d.id === previewId);

  return (
    <AppShell title="Documentation generator">
      <div className="mx-auto max-w-5xl space-y-8">
        <PageSection
          label="AI documentation"
          title="Auto-generate project docs"
          description={
            currentProject?.repo
              ? `Scanning ${currentProject.repo} — README, API reference, architecture docs, and flow diagrams.`
              : "Connect a repository to generate README, API reference, architecture docs, and flow diagrams."
          }
        />

        <GlassCard highlight>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[14px] font-medium text-[#F4F3EF]">Project scan</p>
              <p className="text-[12.5px] text-[#94969E]">
                {isGenerating ? "Analyzing codebase structure..." : "Last scan complete"}
              </p>
            </div>
            <Button variant="primary" onClick={handleGenerate} disabled={!repoId || isGenerating}>
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

          {!repoId && (
            <p className="mt-3 text-[12.5px] text-[#55575F]">
              Connect a GitHub repository to generate documentation for it.
            </p>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#E0685F]/30 bg-[#E0685F]/[0.08] px-3 py-2 text-[12.5px] text-[#E0685F]">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </GlassCard>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {documents.map((doc, i) => {
            const Icon = DOC_ICONS[doc.type];
            const isRegenerating = isRegeneratingType === doc.type;
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
                    <button
                      onClick={() => handleRegenerate(doc.type)}
                      disabled={!repoId || !!isRegeneratingType}
                      className="ml-auto rounded-md p-1 text-[#55575F] transition-colors hover:bg-white/[0.06] hover:text-[#F4F3EF] disabled:opacity-40"
                      aria-label="Regenerate"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
                    </button>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-mono uppercase ${
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
                    <Button size="sm" className="flex-1" onClick={() => setPreviewId(doc.id)}>
                      Preview
                    </Button>
                    <Button size="sm" variant="primary" className="flex-1" onClick={() => handleExport(doc)}>
                      Export
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {previewDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setPreviewId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-xl border border-white/[0.08] bg-[#0A0B0D] p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[15px] font-medium text-[#F4F3EF]">{previewDoc.title}</h3>
                <button
                  onClick={() => setPreviewId(null)}
                  className="rounded-md p-1 text-[#55575F] hover:bg-white/[0.06] hover:text-[#F4F3EF]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <pre className="overflow-auto rounded-lg border border-white/[0.06] bg-[#0A0B0D]/50 p-4 font-mono text-[12px] leading-relaxed text-[#94969E]">
                {previewDoc.content || previewDoc.preview}
              </pre>
              <div className="mt-4 flex justify-end">
                <Button size="sm" variant="primary" onClick={() => handleExport(previewDoc)}>
                  Export
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}