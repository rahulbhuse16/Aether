import { motion } from "framer-motion";
import {
  Layers,
  Server,
  Database,
  HardDrive,
  Radio,
  Globe,
  Loader2,
  ArrowDown,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setPrompt, clearError } from "../store/slices/architectureSlice";
import { generateArchitecture, type ArchitectureNode } from "../services/architecture";


const NODE_STYLES: Record<
  ArchitectureNode["type"],
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  frontend: { icon: Globe, color: "#22A67D" },
  gateway: { icon: Layers, color: "#8B7FE8" },
  service: { icon: Server, color: "#94969E" },
  database: { icon: Database, color: "#8B7FE8" },
  cache: { icon: HardDrive, color: "#22A67D" },
  queue: { icon: Radio, color: "#94969E" },
};

export default function ArchitectureGenerator() {
  const dispatch = useAppDispatch();
  const { prompt, nodes, systemTitle, summary, suggestions, isGenerating, error } =
    useAppSelector((s) => s.architecture);

  const handleGenerate = () => {
    if (!prompt.trim() || isGenerating) return;
    dispatch(clearError());
    dispatch(generateArchitecture({ prompt: prompt.trim() }));
  };

  return (
    <AppShell title="Architecture generator">
      <div className="mx-auto max-w-3xl space-y-8">
        <PageSection
          label="System design"
          title="Generate architecture diagrams"
          description="Describe your product. AI produces a full microservices architecture with services, databases, and infrastructure."
        />

        <GlassCard highlight>
          <label className="mb-2 block font-mono text-[11px] uppercase tracking-wide text-[#22A67D]">
            Product description
          </label>
          <input
            value={prompt}
            onChange={(e) => dispatch(setPrompt(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            className="mb-3 w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-[14px] text-[#F4F3EF] outline-none focus:border-[#8B7FE8]/40"
          />
          <div className="mb-4 flex flex-wrap gap-2">
            {suggestions.map((p) => (
              <button
                key={p}
                onClick={() => dispatch(setPrompt(p))}
                className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1 text-[12px] text-[#94969E] transition-colors hover:border-[#8B7FE8]/30 hover:text-[#F4F3EF]"
              >
                {p}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#E0685F]/30 bg-[#E0685F]/[0.08] px-3 py-2 text-[12.5px] text-[#E0685F]">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <Button variant="primary" onClick={handleGenerate} disabled={!prompt.trim() || isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate architecture"
            )}
          </Button>
        </GlassCard>

        <PageSection label={systemTitle || "Architecture diagram"} delay={0.1}>
          {summary && (
            <p className="mb-4 text-[13px] leading-relaxed text-[#94969E]">{summary}</p>
          )}

          <GlassCard className="py-8">
            <div className="flex flex-col items-center">
              {nodes.map((node, i) => {
                const style = NODE_STYLES[node.type];
                const Icon = style.icon;
                return (
                  <motion.div
                    key={node.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 * i }}
                    className="flex flex-col items-center"
                  >
                    <div
                      className="flex flex-col items-center gap-1 rounded-xl border px-6 py-3"
                      style={{
                        borderColor: `${style.color}40`,
                        background: `${style.color}10`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" style={{ color: style.color }} />
                        <span className="text-[14px] font-medium text-[#F4F3EF]">
                          {node.label}
                        </span>
                        {node.tech && (
                          <span className="rounded-full border border-white/[0.08] px-2 py-0.5 font-mono text-[10px] text-[#55575F]">
                            {node.tech}
                          </span>
                        )}
                      </div>
                      {node.description && (
                        <p className="max-w-xs text-center text-[11.5px] text-[#94969E]">
                          {node.description}
                        </p>
                      )}
                    </div>
                    {i < nodes.length - 1 && (
                      <ArrowDown className="my-2 h-5 w-5 text-[#55575F]" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        </PageSection>
      </div>
    </AppShell>
  );
}