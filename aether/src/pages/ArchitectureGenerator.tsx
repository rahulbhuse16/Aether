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
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setPrompt, setGenerating } from "../store/slices/architectureSlice";
import type { ArchitectureNode } from "../store/types";

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

const PRESETS = ["Build Uber Clone", "E-commerce Platform", "SaaS Dashboard", "Real-time Chat App"];

export default function ArchitectureGenerator() {
  const dispatch = useAppDispatch();
  const { prompt, nodes, isGenerating } = useAppSelector((s) => s.architecture);

  const handleGenerate = () => {
    dispatch(setGenerating(true));
    setTimeout(() => dispatch(setGenerating(false)), 2000);
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
            className="mb-3 w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-[14px] text-[#F4F3EF] outline-none focus:border-[#8B7FE8]/40"
          />
          <div className="mb-4 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => dispatch(setPrompt(p))}
                className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1 text-[12px] text-[#94969E] transition-colors hover:border-[#8B7FE8]/30 hover:text-[#F4F3EF]"
              >
                {p}
              </button>
            ))}
          </div>
          <Button variant="primary" onClick={handleGenerate} disabled={isGenerating}>
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

        <PageSection label="Architecture diagram" delay={0.1}>
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
                      className="flex items-center gap-3 rounded-xl border px-6 py-3"
                      style={{
                        borderColor: `${style.color}40`,
                        background: `${style.color}10`,
                      }}
                    >
                      <Icon className="h-5 w-5" style={{ color: style.color }} />
                      <span className="text-[14px] font-medium text-[#F4F3EF]">{node.label}</span>
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
