import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Link2,
  FileCode,
  Braces,
  Server,
  FlaskConical,
  BookOpen,
  Loader2,
  Sparkles,
  RefreshCw,
  Download,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setSwaggerUrl,
  setGenerating,
  setArtifacts,
  upsertArtifact,
  setArtifactStatus,
  setError,
} from "../store/slices/apiAgentSlice";
import type { ApiArtifact } from "../store/types";
import { apiAgentApi } from "../services/apiAgent";

const ARTIFACT_ICONS: Record<ApiArtifact["type"], React.ComponentType<{ className?: string }>> = {
  docs: BookOpen,
  hooks: FileCode,
  types: Braces,
  service: Server,
  postman: Link2,
  tests: FlaskConical,
};

const ARTIFACT_EXTENSIONS: Record<ApiArtifact["type"], string> = {
  docs: "md",
  hooks: "ts",
  types: "ts",
  service: "ts",
  postman: "json",
  tests: "test.ts",
};

export default function ApiAgent() {
  const dispatch = useAppDispatch();
  const { swaggerUrl, artifacts, isGenerating, error, specTitle } = useAppSelector((s) => s.apiAgent);

  const [regeneratingType, setRegeneratingType] = useState<ApiArtifact["type"] | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);

  // On mount, try to load the last generated session for the current URL so
  // a refresh doesn't lose previously generated artifacts.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiAgentApi.latest(swaggerUrl);
        if (!cancelled && res?.session?.artifacts?.length) {
          dispatch(setArtifacts({ artifacts: res.session.artifacts, specTitle: res.session.specTitle }));
        }
      } catch {
        // no existing session yet — fine, just start empty
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    if (!swaggerUrl.trim()) return;
    dispatch(setGenerating(true));
    try {
      const res = await apiAgentApi.generate(swaggerUrl.trim());
      dispatch(setArtifacts({ artifacts: res?.artifacts || [], specTitle: res?.specTitle }));
    } catch (err: any) {
      dispatch(setError(err.message || "Failed to generate artifacts"));
    }
  };

  const handleRegenerate = async (type: ApiArtifact["type"]) => {
    setRegeneratingType(type);
    dispatch(setArtifactStatus({ type, status: "generating" }));
    try {
      const res = await apiAgentApi.regenerate(swaggerUrl.trim(), type);
      if (res?.artifact) dispatch(upsertArtifact(res?.artifact));
    } catch (err: any) {
      dispatch(setArtifactStatus({ type, status: "error" }));
      dispatch(setError(err.message || `Failed to regenerate ${type}`));
    } finally {
      setRegeneratingType(null);
    }
  };

  const handleCopy = async (artifact: ApiArtifact) => {
    await navigator.clipboard.writeText(artifact.content);
    setCopiedId(artifact.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDownload = (artifact: ApiArtifact) => {
    const ext = ARTIFACT_EXTENSIONS[artifact.type];
    const blob = new Blob([artifact.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.type}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell title="API agent">
      <div className="mx-auto max-w-5xl space-y-8">
        <PageSection
          label="API automation"
          title="From Swagger to production code"
          description="Paste a Swagger/OpenAPI URL. AI generates documentation, React Query hooks, TypeScript types, Axios services, Postman collections, and test cases."
        />

        <GlassCard highlight>
          <label className="mb-2 block font-mono text-[11px] uppercase tracking-wide text-[#22A67D]">
            OpenAPI / Swagger URL
          </label>
          <div className="flex gap-2">
            <input
              value={swaggerUrl}
              onChange={(e) => dispatch(setSwaggerUrl(e.target.value))}
              placeholder="https://api.example.com/swagger.json"
              className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 font-mono text-[13px] text-[#F4F3EF] outline-none focus:border-[#8B7FE8]/40"
            />
            <Button variant="primary" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          </div>
          {specTitle && (
            <p className="mt-2 font-mono text-[11px] text-[#94969E]">
              Last generated for: <span className="text-[#F4F3EF]">{specTitle}</span>
            </p>
          )}
          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </GlassCard>

        {loadingExisting ? (
          <div className="flex items-center gap-2 text-[13px] text-[#94969E]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking for a previous session...
          </div>
        ) : artifacts.length === 0 && !isGenerating ? (
          <div className="rounded-lg border border-dashed border-white/[0.08] p-8 text-center text-[13px] text-[#94969E]">
            No artifacts yet. Paste a Swagger/OpenAPI URL above and hit Generate.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {artifacts.map((artifact, i) => {
              const Icon = ARTIFACT_ICONS[artifact.type];
              const isRegenerating = regeneratingType === artifact.type || artifact.status === "generating";
              return (
                <motion.div
                  key={artifact.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i }}
                >
                  <GlassCard className="flex h-full flex-col">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                          <Icon className="h-4 w-4 text-[#22A67D]" />
                        </div>
                        <div>
                          <h3 className="text-[13.5px] font-medium text-[#F4F3EF]">{artifact.name}</h3>
                          <span
                            className={
                              artifact.status === "error"
                                ? "text-[11px] text-red-400"
                                : "text-[11px] text-[#22A67D]"
                            }
                          >
                            {isRegenerating ? "regenerating..." : artifact.status}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRegenerate(artifact.type)}
                        disabled={isRegenerating}
                        title="Regenerate this artifact"
                        className="rounded-md p-1.5 text-[#94969E] hover:bg-white/[0.06] hover:text-[#F4F3EF] disabled:opacity-40"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                    <pre className="mb-3 flex-1 overflow-hidden rounded-lg border border-white/[0.06] bg-[#0A0B0D]/50 p-3 font-mono text-[11px] leading-relaxed text-[#94969E]">
                      {artifact.preview.slice(0, 120)}...
                    </pre>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => handleCopy(artifact)}>
                        {copiedId === artifact.id ? (
                          <>
                            <Check className="h-3.5 w-3.5" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </>
                        )}
                      </Button>
                      <Button size="sm" className="flex-1" onClick={() => handleDownload(artifact)}>
                        <Download className="h-3.5 w-3.5" /> Download
                      </Button>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}