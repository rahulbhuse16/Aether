import { useState } from "react";
import { motion } from "framer-motion";
import { Rocket, Container, Workflow, Cloud, FileCode, Loader2 } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setGenerating } from "../store/slices/deploymentSlice";
import type { DeploymentArtifact } from "../store/types";
import { FaGithub } from "react-icons/fa";

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
  const { artifacts, isGenerating, connectedRepo } = useAppSelector((s) => s.deployment);
  const [selectedId, setSelectedId] = useState(artifacts[0]?.id ?? "");

  const selected = artifacts.find((a) => a.id === selectedId);

  const handleGenerate = () => {
    dispatch(setGenerating(true));
    setTimeout(() => dispatch(setGenerating(false)), 2000);
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
                <p className="font-mono text-[12px] text-[#94969E]">{connectedRepo}</p>
              </div>
            </div>
            <Button variant="primary" onClick={handleGenerate} disabled={isGenerating}>
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
                </button>
              );
            })}
          </div>

          <motion.div
            key={selectedId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="lg:col-span-2"
          >
            <GlassCard className="h-full">
              <div className="mb-3 flex items-center gap-2">
                <FileCode className="h-4 w-4 text-[#22A67D]" />
                <h3 className="text-[14px] font-medium text-[#F4F3EF]">{selected?.name}</h3>
              </div>
              <pre className="overflow-x-auto rounded-lg border border-white/[0.06] bg-[#0A0B0D]/50 p-4 font-mono text-[12px] leading-relaxed text-[#94969E]">
                {selected?.content}
              </pre>
              <div className="mt-4 flex gap-2">
                <Button size="sm" className="flex-1">
                  Copy
                </Button>
                <Button size="sm" variant="primary" className="flex-1">
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
