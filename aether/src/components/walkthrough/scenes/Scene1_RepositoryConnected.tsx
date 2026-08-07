import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GitBranch, Users, CheckCircle2, Loader2, FileText, Folder } from "lucide-react";

export default function Scene1_RepositoryConnected() {
  const [syncProgress, setSyncProgress] = useState(0);
  const [healthScore, setHealthScore] = useState(0);
  const [filesIndexed, setFilesIndexed] = useState(0);
  const [branchesLoaded, setBranchesLoaded] = useState(0);
  const [contributors, setContributors] = useState(0);

  useEffect(() => {
    // Animate sync progress
    const syncInterval = setInterval(() => {
      setSyncProgress((prev) => {
        if (prev >= 100) {
          clearInterval(syncInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    // Animate health score
    const healthInterval = setInterval(() => {
      setHealthScore((prev) => {
        if (prev >= 100) {
          clearInterval(healthInterval);
          return 100;
        }
        return prev + 1;
      });
    }, 30);

    // Animate files indexed
    const filesInterval = setInterval(() => {
      setFilesIndexed((prev) => {
        if (prev >= 234) {
          clearInterval(filesInterval);
          return 234;
        }
        return prev + 4;
      });
    }, 40);

    // Animate branches
    const branchesInterval = setInterval(() => {
      setBranchesLoaded((prev) => {
        if (prev >= 8) {
          clearInterval(branchesInterval);
          return 8;
        }
        return prev + 1;
      });
    }, 200);

    // Animate contributors
    const contributorsInterval = setInterval(() => {
      setContributors((prev) => {
        if (prev >= 12) {
          clearInterval(contributorsInterval);
          return 12;
        }
        return prev + 1;
      });
    }, 150);

    return () => {
      clearInterval(syncInterval);
      clearInterval(healthInterval);
      clearInterval(filesInterval);
      clearInterval(branchesInterval);
      clearInterval(contributorsInterval);
    };
  }, []);

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Repository Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#8B7FE8]/10 border border-[#8B7FE8]/20">
              <GitBranch className="h-6 w-6 text-[#8B7FE8]" />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold text-[#F4F3EF]">
                aether-platform
              </h2>
              <p className="text-[12px] text-[#55575F]">
                github.com/aether/platform
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg bg-[#22A67D]/10 border border-[#22A67D]/20 px-3 py-1.5">
              <CheckCircle2 className="h-4 w-4 text-[#22A67D]" />
              <span className="text-[12px] font-medium text-[#22A67D]">
                Connected
              </span>
            </div>
          </div>
        </div>

        {/* Sync Progress */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] text-[#94969E]">Syncing repository...</span>
            <span className="text-[12px] font-medium text-[#F4F3EF]">
              {syncProgress}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#8B7FE8] to-[#22A67D]"
              style={{ width: `${syncProgress}%` }}
            />
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: FileText, label: "Files", value: filesIndexed, total: 234 },
          { icon: Folder, label: "Directories", value: 18, total: 18 },
          { icon: GitBranch, label: "Branches", value: branchesLoaded, total: 8 },
          { icon: Users, label: "Contributors", value: contributors, total: 12 },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className="h-4 w-4 text-[#8B7FE8]" />
                <span className="text-[11px] text-[#55575F]">{stat.label}</span>
              </div>
              <div className="text-[24px] font-semibold text-[#F4F3EF]">
                {stat.value}
              </div>
              <div className="text-[10px] text-[#55575F]">
                of {stat.total}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Repository Health */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-[#F4F3EF]">
            Repository Health
          </h3>
          <div className="flex items-center gap-2">
            {healthScore < 100 ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#8B7FE8]" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-[#22A67D]" />
            )}
            <span className="text-[14px] font-semibold text-[#F4F3EF]">
              {healthScore}%
            </span>
          </div>
        </div>

        {/* Health Metrics */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Code Quality", value: healthScore >= 80 ? "Excellent" : "Good" },
            { label: "Test Coverage", value: "87%" },
            { label: "Documentation", value: "92%" },
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + (index * 0.1) }}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
            >
              <p className="text-[11px] text-[#55575F]">{metric.label}</p>
              <p className="mt-1 text-[13px] font-medium text-[#F4F3EF]">
                {metric.value}
              </p>
            </motion.div>
          ))}
        </div>

        {/* AI Scanning Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-4 flex items-center gap-3 rounded-lg border border-[#8B7FE8]/20 bg-[#8B7FE8]/5 p-3"
        >
          <div className="relative">
            <div className="h-2 w-2 rounded-full bg-[#8B7FE8]" />
            <div className="absolute inset-0 h-2 w-2 animate-ping rounded-full bg-[#8B7FE8]" />
          </div>
          <span className="text-[12px] text-[#A69DF0]">
            AI is scanning repository structure...
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
