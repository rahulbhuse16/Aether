// Path: src/pages/Onboarding.tsx
//
// First-run flow: connect GitHub, pick a repo, watch it get indexed, land
// on the Dashboard with a real project. Step state is local (useState) —
// it's only meaningful during this one flow, so it doesn't belong in Redux.
// The result (the new project) is dispatched to the store once, at the end.

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FaGithub } from "react-icons/fa";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { Logo } from "../components/Logo";
import { useAppDispatch } from "../store/hooks";
import { addProject } from "../store/slices/projectsSlice";
import { AmbientBackground } from "../components/AmbientBackGround";

type Step = 1 | 2 | 3;

const MOCK_REPOS = [
  { id: "r1", name: "aether/core", description: "Main application repository" },
  { id: "r2", name: "aether/billing", description: "Billing and subscriptions service" },
  { id: "r3", name: "acme/webapp", description: "Customer-facing web app" },
];

const INDEX_STEPS = [
  "cloning repository",
  "chunking files",
  "generating embeddings",
  "indexing complete",
];

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium transition-colors ${
              s < step
                ? "bg-[#22A67D] text-[#0A0B0D]"
                : s === step
                ? "border border-[#8B7FE8] text-[#F4F3EF]"
                : "border border-white/[0.1] text-[#55575F]"
            }`}
          >
            {s < step ? <Check className="h-3.5 w-3.5" /> : s}
          </div>
          {s < 3 && (
            <div
              className={`h-px w-8 ${s < step ? "bg-[#22A67D]" : "bg-white/[0.1]"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ConnectStep({ onConnected }: { onConnected: () => void }) {
  const [loading, setLoading] = useState(false);

  function handleConnect() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onConnected();
    }, 900);
  }

  return (
    <div className="text-center">
      <h2 className="text-[19px] font-medium tracking-tight text-[#F4F3EF]">
        Connect your GitHub account
      </h2>
      <p className="mx-auto mt-2 max-w-xs text-[13.5px] leading-relaxed text-[#94969E]">
        Aether needs read access to index your repository and post review
        comments on pull requests.
      </p>

      <button
        onClick={handleConnect}
        disabled={loading}
        className="mx-auto mt-7 flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-2.5 text-[14px] font-medium text-[#F4F3EF] transition-all hover:border-white/[0.16] hover:bg-white/[0.05] disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FaGithub className="h-4 w-4" />
        )}
        Connect with GitHub
      </button>

      <p className="mt-4 text-[12px] text-[#55575F]">
        Read-only access. Nothing is written without your approval.
      </p>
    </div>
  );
}

function SelectRepoStep({
  onSelected,
}: {
  onSelected: (repo: (typeof MOCK_REPOS)[number]) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div>
      <h2 className="text-center text-[19px] font-medium tracking-tight text-[#F4F3EF]">
        Select a repository
      </h2>
      <p className="mx-auto mt-2 max-w-xs text-center text-[13.5px] leading-relaxed text-[#94969E]">
        Pick the repo you want Aether to index first — you can connect more
        later.
      </p>

      <div className="mt-6 space-y-2">
        {MOCK_REPOS.map((repo) => (
          <button
            key={repo.id}
            onClick={() => setSelected(repo.id)}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
              selected === repo.id
                ? "border-[#8B7FE8]/50 bg-[#8B7FE8]/[0.06]"
                : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
            }`}
          >
            <div>
              <p className="font-mono text-[13px] text-[#F4F3EF]">{repo.name}</p>
              <p className="text-[12px] text-[#94969E]">{repo.description}</p>
            </div>
            <div
              className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${
                selected === repo.id
                  ? "border-[#8B7FE8] bg-[#8B7FE8]"
                  : "border-white/[0.2]"
              }`}
            >
              {selected === repo.id && (
                <Check className="h-3 w-3 text-[#0A0B0D]" />
              )}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={() => {
          const repo = MOCK_REPOS.find((r) => r.id === selected);
          if (repo) onSelected(repo);
        }}
        disabled={!selected}
        className="group mt-6 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#8B7FE8] to-[#22A67D] py-2.5 text-[14px] font-medium text-[#0A0B0D] transition-all hover:brightness-[1.05] disabled:opacity-40"
      >
        Continue
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}

function IndexingStep({
  repoName,
  onDone,
}: {
  repoName: string;
  onDone: () => void;
}) {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    if (lineIndex >= INDEX_STEPS.length) {
      const t = setTimeout(onDone, 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setLineIndex((i) => i + 1), 550);
    return () => clearTimeout(t);
  }, [lineIndex, onDone]);

  const progress = Math.min(100, (lineIndex / INDEX_STEPS.length) * 100);

  return (
    <div className="text-center">
      <h2 className="text-[19px] font-medium tracking-tight text-[#F4F3EF]">
        Indexing {repoName}
      </h2>
      <p className="mx-auto mt-2 max-w-xs text-[13.5px] leading-relaxed text-[#94969E]">
        This only happens once — Aether keeps the index in sync after this.
      </p>

      <div className="mx-auto mt-6 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#8B7FE8] to-[#22A67D]"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="mx-auto mt-6 max-w-xs space-y-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 text-left font-mono text-[12px]">
        {INDEX_STEPS.map((line, i) => (
          <div
            key={line}
            className={`flex items-center gap-2 transition-opacity ${
              i <= lineIndex ? "opacity-100" : "opacity-30"
            }`}
          >
            <span className="text-[#22A67D]">&rsaquo;</span>
            <span className={i < lineIndex ? "text-[#55575F]" : "text-[#F4F3EF]"}>
              {line}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Onboarding() {
  const location = useLocation();
  const skipConnect = Boolean(
    (location.state as { skipConnect?: boolean } | null)?.skipConnect
  );

  const [step, setStep] = useState<Step>(skipConnect ? 2 : 1);
  const [selectedRepo, setSelectedRepo] = useState<(typeof MOCK_REPOS)[number] | null>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  function handleIndexingDone() {
    if (!selectedRepo) return;
    dispatch(
      addProject({
        id: selectedRepo.id,
        name: selectedRepo.name.split("/")[1],
        repo: selectedRepo.name,
        openTasks: 0,
        lastActivity: "just now",
      })
    );
    navigate("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#0A0B0D] px-6">
      <AmbientBackground />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2.5">
          <Logo size={34} />
          <span className="text-[14px] font-medium tracking-tight text-[#F4F3EF]">
            Aether
          </span>
        </div>

        <div className="relative rounded-2xl bg-gradient-to-br from-[#8B7FE8]/25 via-white/[0.06] to-[#22A67D]/25 p-px shadow-2xl shadow-black/50">
          <div className="rounded-[15px] bg-[#101215]/95 px-7 py-8 backdrop-blur-xl sm:px-9 sm:py-9">
            <StepIndicator step={step} />

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {step === 1 && (
                  <ConnectStep onConnected={() => setStep(2)} />
                )}
                {step === 2 && (
                  <SelectRepoStep
                    onSelected={(repo) => {
                      setSelectedRepo(repo);
                      setStep(3);
                    }}
                  />
                )}
                {step === 3 && selectedRepo && (
                  <IndexingStep
                    repoName={selectedRepo.name}
                    onDone={handleIndexingDone}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}