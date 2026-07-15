// Path: src/pages/Onboarding.tsx
//
// First-run flow: connect GitHub, pick a real repo, watch it actually get
// indexed, land on the Dashboard with a real project. Step state is local
// (useState) — it's only meaningful during this one flow, so it doesn't
// belong in Redux. The result (the new project) is dispatched to the
// store once, at the end, using exactly what the backend returns.

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FaGithub } from "react-icons/fa";
import { AlertCircle, Check, ChevronRight, Loader2, Lock, RefreshCw } from "lucide-react";
import { Logo } from "../components/Logo";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { addProject } from "../store/slices/projectsSlice";
import { AmbientBackground } from "../components/AmbientBackGround";
import { loadUser } from "../services/auth";
import {
  fetchGithubRepos,
  indexGithubRepo,
  type GithubRepoListItem,
  type IndexedProject,
} from "../services/onboarding";

type Step = 1 | 2 | 3;

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

  async function handleConnect() {
    setLoading(true);
    try {
      const userId = localStorage.getItem("userId") as string;
      // Full-page redirect to the GitHub OAuth flow — the browser leaves
      // this page, so onConnected()/loadUser() below don't meaningfully
      // run before that happens. Step 2 is reached instead via the
      // `success=true` redirect param once GitHub sends the user back
      // (see initialStep in the component below).
      window.location.href = `https://aether-api-y0ob.onrender.com/api/v1/github/connect?state=${userId}`;
      onConnected();
      await loadUser();
    } catch {
      // Redirect failed to even start — let them try again.
    } finally {
      setLoading(false);
    }
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

function RepoListSkeleton() {
  return (
    <div className="mt-6 space-y-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-[58px] animate-pulse rounded-xl border border-white/[0.08] bg-white/[0.02]"
        />
      ))}
    </div>
  );
}

function SelectRepoStep({
  onSelected,
}: {
  onSelected: (repo: GithubRepoListItem) => void;
}) {
  const [repos, setRepos] = useState<GithubRepoListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  function load() {
    setError(null);
    setRepos(null);
    fetchGithubRepos()
      .then(setRepos)
      .catch((err: Error) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h2 className="text-center text-[19px] font-medium tracking-tight text-[#F4F3EF]">
        Select a repository
      </h2>
      <p className="mx-auto mt-2 max-w-xs text-center text-[13.5px] leading-relaxed text-[#94969E]">
        Pick the repo you want Aether to index first — you can connect more
        later.
      </p>

      {repos === null && !error && <RepoListSkeleton />}

      {error && (
        <div className="mt-6 rounded-xl border border-[#E8836B]/30 bg-[#E8836B]/[0.06] px-4 py-3.5 text-center">
          <AlertCircle className="mx-auto h-4 w-4 text-[#E8836B]" />
          <p className="mt-2 text-[13px] text-[#F4F3EF]">{error}</p>
          <button
            onClick={load}
            className="mx-auto mt-3 flex items-center justify-center gap-1.5 text-[12.5px] font-medium text-[#8B7FE8] hover:text-[#a599ec]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      )}

      {repos && repos.length === 0 && (
        <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-5 text-center">
          <p className="text-[13.5px] text-[#94969E]">
            No repositories found for this account. Grant Aether access to a
            repo on GitHub, then refresh.
          </p>
          <button
            onClick={load}
            className="mx-auto mt-3 flex items-center justify-center gap-1.5 text-[12.5px] font-medium text-[#8B7FE8] hover:text-[#a599ec]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      )}

      {repos && repos.length > 0 && (
        <div className="mt-6 max-h-[280px] space-y-2 overflow-y-auto pr-0.5">
          {repos.map((repo) => (
            <button
              key={repo.id}
              onClick={() => setSelected(repo.id)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                selected === repo.id
                  ? "border-[#8B7FE8]/50 bg-[#8B7FE8]/[0.06]"
                  : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="truncate font-mono text-[13px] text-[#F4F3EF]">
                    {repo.name}
                  </p>
                  {repo.private && (
                    <Lock className="h-3 w-3 flex-shrink-0 text-[#55575F]" />
                  )}
                </div>
                <p className="truncate text-[12px] text-[#94969E]">
                  {repo.description || "No description"}
                  {repo.openIssues > 0 && (
                    <span className="text-[#55575F]">
                      {" "}
                      · {repo.openIssues} open issue{repo.openIssues === 1 ? "" : "s"}
                    </span>
                  )}
                </p>
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
      )}

      <button
        onClick={() => {
          const repo = repos?.find((r) => r.id === selected);
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
  repo,
  onDone,
  onBack,
}: {
  repo: GithubRepoListItem;
  onDone: (project: IndexedProject) => void;
  onBack: () => void;
}) {
  const [lineIndex, setLineIndex] = useState(0);
  const [animationDone, setAnimationDone] = useState(false);
  const [result, setResult] = useState<IndexedProject | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // The real work — runs once, independent of the display animation below.
  // Whichever finishes last (the fetch or the minimum-perceived-progress
  // animation) is what actually triggers onDone, so indexing never looks
  // "complete" before the project genuinely exists in the database, and
  // a fast response doesn't make the step flash by instantly.
  useEffect(() => {
    let cancelled = false;
    indexGithubRepo(repo.id)
      .then((project) => {
        if (!cancelled) setResult(project);
      })
      .catch((err: Error) => {
        if (!cancelled) setApiError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [repo.id]);

  useEffect(() => {
    if (apiError) return;
    if (lineIndex >= INDEX_STEPS.length) {
      setAnimationDone(true);
      return;
    }
    const t = setTimeout(() => setLineIndex((i) => i + 1), 550);
    return () => clearTimeout(t);
  }, [lineIndex, apiError]);

  useEffect(() => {
    if (animationDone && result) {
      const t = setTimeout(() => onDone(result), 450);
      return () => clearTimeout(t);
    }
  }, [animationDone, result, onDone]);

  if (apiError) {
    return (
      <div className="text-center">
        <h2 className="text-[19px] font-medium tracking-tight text-[#F4F3EF]">
          Indexing failed
        </h2>
        <div className="mx-auto mt-4 max-w-xs rounded-xl border border-[#E8836B]/30 bg-[#E8836B]/[0.06] px-4 py-3.5">
          <AlertCircle className="mx-auto h-4 w-4 text-[#E8836B]" />
          <p className="mt-2 text-[13px] text-[#F4F3EF]">{apiError}</p>
        </div>
        <button
          onClick={onBack}
          className="mx-auto mt-5 flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-2 text-[13.5px] font-medium text-[#F4F3EF] transition-colors hover:bg-white/[0.05]"
        >
          Back to repositories
        </button>
      </div>
    );
  }

  const progress = Math.min(100, (lineIndex / INDEX_STEPS.length) * 100);

  return (
    <div className="text-center">
      <h2 className="text-[19px] font-medium tracking-tight text-[#F4F3EF]">
        Indexing {repo.name}
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
  const [searchParams] = useSearchParams();

  const authState = useAppSelector((state) => state.auth.user);

  const success = searchParams.get("success");

  const initialStep = success === "true" || authState?.githubToken ? 2 : 1;

  const [step, setStep] = useState<Step>(initialStep);
  const [selectedRepo, setSelectedRepo] = useState<GithubRepoListItem | null>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  function handleIndexingDone(project: IndexedProject) {
    // Dispatch exactly what the backend persisted — no client-side
    // reshaping, so the store matches Mongo from the first render.
    dispatch(addProject(project));
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
                    repo={selectedRepo}
                    onDone={handleIndexingDone}
                    onBack={() => {
                      setSelectedRepo(null);
                      setStep(2);
                    }}
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