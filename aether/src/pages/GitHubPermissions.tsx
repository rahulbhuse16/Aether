import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  GitPullRequest,
  GitCommit,
  RefreshCw,
  Check,
  GitBranch,
} from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { GoBackButton } from "../components/ui/GoBackButton";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  fetchGitHubPermissions,
  updateGitHubPermissions,
  syncRepositories,
} from "../services/githubPermissions";

export default function GitHubPermissions() {
  const dispatch = useAppDispatch();
  const userId = localStorage.getItem("userId") as string;
  const {
    repoAccess,
    webhookEnabled,
    commitAnalysisEnabled,
    prAnalysisEnabled,
    lastSync,
    loading,
  } = useAppSelector((s) => s.githubPermissions);

  useEffect(() => {
    if (userId) {
      dispatch(fetchGitHubPermissions({ userId }));
    }
  }, [dispatch, userId]);

  const handleToggleWebhook = () => {
    dispatch(
      updateGitHubPermissions({
        userId,
        webhookEnabled: !webhookEnabled,
      })
    );
  };

  const handleToggleCommitAnalysis = () => {
    dispatch(
      updateGitHubPermissions({
        userId,
        commitAnalysisEnabled: !commitAnalysisEnabled,
      })
    );
  };

  const handleTogglePRAnalysis = () => {
    dispatch(
      updateGitHubPermissions({
        userId,
        prAnalysisEnabled: !prAnalysisEnabled,
      })
    );
  };

  const handleSyncRepos = () => {
    dispatch(syncRepositories({ userId }));
  };

  return (
    <AppShell title="GitHub Permissions">
      <div className="mx-auto max-w-3xl space-y-8">
        <GoBackButton to="/settings" className="mb-2" />

        <PageSection label="Integration" title="GitHub Connection">
          <GlassCard>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#8B7FE8] to-[#22A67D] text-[#0A0B0D]">
                <FaGithub className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-medium text-[#F4F3EF]">
                  GitHub Integration
                </p>
                <p className="text-[13px] text-[#94969E]">
                  Manage repository access and analysis permissions
                </p>
                {lastSync && (
                  <p className="mt-1 text-[11px] text-[#55575F]">
                    Last synced: {new Date(lastSync).toLocaleString()}
                  </p>
                )}
              </div>
              <Button size="sm" onClick={handleSyncRepos} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Sync Repos
              </Button>
            </div>
          </GlassCard>
        </PageSection>

        <PageSection label="Permissions" title="Analysis Settings" delay={0.05}>
          <GlassCard>
            <div className="mb-6">
              <p className="text-[13px] text-[#94969E]">
                Configure which GitHub features Aether can analyze.
              </p>
            </div>

            <div className="space-y-3">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <GlassCard className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                      <GitPullRequest className="h-4 w-4 text-[#94969E]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[#F4F3EF]">
                        PR Webhooks
                      </p>
                      <p className="text-[12px] text-[#55575F]">
                        Enable automatic PR analysis via webhooks
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleWebhook}
                    disabled={loading}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      webhookEnabled ? "bg-[#8B7FE8]" : "bg-white/[0.1]"
                    }`}
                  >
                    <motion.div
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                        webhookEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </GlassCard>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <GlassCard className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                      <GitCommit className="h-4 w-4 text-[#94969E]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[#F4F3EF]">
                        Commit Analysis
                      </p>
                      <p className="text-[12px] text-[#55575F]">
                        Analyze commits for code quality and patterns
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleCommitAnalysis}
                    disabled={loading}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      commitAnalysisEnabled ? "bg-[#8B7FE8]" : "bg-white/[0.1]"
                    }`}
                  >
                    <motion.div
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                        commitAnalysisEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </GlassCard>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <GlassCard className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                      <GitBranch className="h-4 w-4 text-[#94969E]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[#F4F3EF]">
                        PR Analysis
                      </p>
                      <p className="text-[12px] text-[#55575F]">
                        AI-powered pull request reviews and suggestions
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleTogglePRAnalysis}
                    disabled={loading}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      prAnalysisEnabled ? "bg-[#8B7FE8]" : "bg-white/[0.1]"
                    }`}
                  >
                    <motion.div
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                        prAnalysisEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </GlassCard>
              </motion.div>
            </div>
          </GlassCard>
        </PageSection>

        <PageSection label="Repositories" title="Accessible Repositories" delay={0.1}>
          <GlassCard>
            <div className="mb-4">
              <p className="text-[13px] text-[#94969E]">
                Repositories Aether has access to analyze.
              </p>
            </div>

            {repoAccess.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-[#94969E]">
                No repositories connected. Click "Sync Repos" to connect your GitHub repositories.
              </div>
            ) : (
              <div className="space-y-2">
                {repoAccess.map((repo, index) => (
                  <motion.div
                    key={repo}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                  >
                    <GlassCard className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                          <GitBranch className="h-4 w-4 text-[#94969E]" />
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-[#F4F3EF]">
                            {repo}
                          </p>
                        </div>
                      </div>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#22A67D]/15">
                        <Check className="h-3.5 w-3.5 text-[#22A67D]" />
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>
        </PageSection>
      </div>
    </AppShell>
  );
}
