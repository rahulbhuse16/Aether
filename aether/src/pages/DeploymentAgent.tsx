import { use, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Rocket, Container, Workflow, Cloud, FileCode, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { clearDeploymentError } from "../store/slices/deploymentSlice";

import { FaGithub } from "react-icons/fa";
import { fetchLatestDeploymentSession, generateDeploymentArtifacts, regenerateDeploymentArtifact } from "../services/deployment";
import type { DeploymentArtifact } from "../store/types";

const ARTIFACT_ICONS: Record<
  DeploymentArtifact["type"],
  React.ComponentType<{ className?: string }>
> = {
  dockerfile: Container,
  nginx: Workflow,
  "github-actions": FaGithub,
  kubernetes: Cloud,
};

export default function DeploymentAgent() {
  const dispatch = useAppDispatch();
  const { artifacts, isGenerating, isRegeneratingType, connectedRepo, branch, error } =
    useAppSelector((s) => s.deployment);
  const [selectedId, setSelectedId] = useState(artifacts[0]?.id ?? "");

  const repoId=useAppSelector((s)=>s.projects.currentProjectId)
  const selected = artifacts.find((a) => a.id === selectedId) ?? artifacts[0];

  useEffect(() => {
    if (repoId) {
      dispatch(fetchLatestDeploymentSession({ repoId }));
    }
  }, [repoId]);

  useEffect(() => {
    if (!selectedId && artifacts[0]) {
      setSelectedId(artifacts[0].id);
    }
  }, [artifacts, selectedId]);

  const handleGenerate = () => {
    if (!repoId || isGenerating) return;
    dispatch(clearDeploymentError());
    dispatch(generateDeploymentArtifacts({ repoId, branch: branch || undefined }));
  };

  const handleRegenerate = (type: DeploymentArtifact["type"]) => {
    if (!repoId || isRegeneratingType) return;
    dispatch(clearDeploymentError());
    dispatch(regenerateDeploymentArtifact({ repoId, branch: branch || undefined, type }));
  };

  const handleCopy = () => {
    if (selected?.content) navigator.clipboard.writeText(selected.content);
  };

  const handleDownload = () => {
    if (!selected) return;
    const blob = new Blob([selected.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selected.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell title="Deployment agent">
      <div className="mx-auto max-w-5xl space-y-8">
        <PageSection
          label="DevOps automation"
          title="From repo to production"
          description="Connect GitHub. AI generates Dockerfile, Nginx config, GitHub Actions, and Kubernetes manifests."
        />

        <GlassCard highlight>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                <FaGithub className="h-5 w-5 text-[#F4F3EF]" />
              </div>
              <div>
                <p className="text-[14px] font-medium text-[#F4F3EF]">Connected repository</p>
                <p className="font-mono text-[12px] text-[#94969E]">
                  {connectedRepo || "No repository connected"}
                </p>
              </div>
            </div>
            <Button variant="primary" onClick={handleGenerate} disabled={!repoId || isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" />
                  Regenerate all
                </>
              )}
            </Button>
          </div>

          {!repoId && (
            <p className="mt-3 text-[12.5px] text-[#55575F]">
              Connect a GitHub repository to generate deployment artifacts for it.
            </p>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#E0685F]/30 bg-[#E0685F]/[0.08] px-3 py-2 text-[12.5px] text-[#E0685F]">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </GlassCard>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-2">
            {artifacts.map((artifact) => {
              const Icon = ARTIFACT_ICONS[artifact.type];
              return (
                <button
                  key={artifact.id}
                  onClick={() => setSelectedId(artifact.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                    selectedId === artifact.id
                      ? "border-[#8B7FE8]/30 bg-[#8B7FE8]/[0.06]"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16]"
                  }`}
                >
                  <Icon className="h-4 w-4 text-[#22A67D]" />
                  <span className="text-[13.5px] text-[#F4F3EF]">{artifact.name}</span>
                  {isRegeneratingType === artifact.type && (
                    <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-[#55575F]" />
                  )}
                </button>
              );
            })}
          </div>

          <motion.div
            key={selected?.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="lg:col-span-2"
          >
            <GlassCard className="h-full">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-[#22A67D]" />
                  <h3 className="text-[14px] font-medium text-[#F4F3EF]">{selected?.name}</h3>
                </div>
                <button
                  onClick={() => selected && handleRegenerate(selected.type)}
                  disabled={!repoId || !!isRegeneratingType}
                  className="flex items-center gap-1.5 rounded-md border border-white/[0.08] px-2.5 py-1 text-[11.5px] text-[#94969E] transition-colors hover:border-[#8B7FE8]/30 hover:text-[#F4F3EF] disabled:opacity-40"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${isRegeneratingType === selected?.type ? "animate-spin" : ""}`}
                  />
                  Regenerate
                </button>
              </div>
              <pre className="overflow-x-auto rounded-lg border border-white/[0.06] bg-[#0A0B0D]/50 p-4 font-mono text-[12px] leading-relaxed text-[#94969E]">
                {selected?.content}
              </pre>
              <div className="mt-4 flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleCopy}>
                  Copy
                </Button>
                <Button size="sm" variant="primary" className="flex-1" onClick={handleDownload}>
                  Download
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </AppShell>
  );
}