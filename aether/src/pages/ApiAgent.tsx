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
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setSwaggerUrl, setGenerating } from "../store/slices/apiAgentSlice";
import type { ApiArtifact } from "../store/types";

const ARTIFACT_ICONS: Record<ApiArtifact["type"], React.ComponentType<{ className?: string }>> = {
  docs: BookOpen,
  hooks: FileCode,
  types: Braces,
  service: Server,
  postman: Link2,
  tests: FlaskConical,
};

export default function ApiAgent() {
  const dispatch = useAppDispatch();
  const { swaggerUrl, artifacts, isGenerating } = useAppSelector((s) => s.apiAgent);

  const handleGenerate = () => {
    dispatch(setGenerating(true));
    setTimeout(() => dispatch(setGenerating(false)), 2000);
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
        </GlassCard>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {artifacts.map((artifact, i) => {
            const Icon = ARTIFACT_ICONS[artifact.type];
            return (
              <motion.div
                key={artifact.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
              >
                <GlassCard className="flex h-full flex-col">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                      <Icon className="h-4 w-4 text-[#22A67D]" />
                    </div>
                    <div>
                      <h3 className="text-[13.5px] font-medium text-[#F4F3EF]">{artifact.name}</h3>
                      <span className="text-[11px] text-[#22A67D]">{artifact.status}</span>
                    </div>
                  </div>
                  <pre className="mb-3 flex-1 overflow-hidden rounded-lg border border-white/[0.06] bg-[#0A0B0D]/50 p-3 font-mono text-[11px] leading-relaxed text-[#94969E]">
                    {artifact.preview.slice(0, 120)}...
                  </pre>
                  <Button size="sm" className="w-full">
                    Copy / Download
                  </Button>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
