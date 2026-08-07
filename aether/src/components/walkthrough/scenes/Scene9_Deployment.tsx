import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Rocket, CheckCircle2, Loader2, Server, Activity } from "lucide-react";

export default function Scene9_Deployment() {
  const [pipelineStage, setPipelineStage] = useState<"build" | "test" | "deploy" | "complete">("build");
  const [testProgress, setTestProgress] = useState(0);
  const [buildProgress, setBuildProgress] = useState(0);
  const [deployProgress, setDeployProgress] = useState(0);
  const [checks, setChecks] = useState<Array<{ name: string; status: "pending" | "running" | "passed" | "failed" }>>([]);

  const mockChecks = [
    { name: "Lint Check", status: "pending" as const },
    { name: "Unit Tests", status: "pending" as const },
    { name: "Integration Tests", status: "pending" as const },
    { name: "Security Scan", status: "pending" as const },
    { name: "Performance Tests", status: "pending" as const },
  ];

  useEffect(() => {
    // Build stage
    const buildInterval = setInterval(() => {
      setBuildProgress((prev) => {
        if (prev >= 100) {
          clearInterval(buildInterval);
          setPipelineStage("test");
          return 100;
        }
        return prev + 3;
      });
    }, 50);

    // Test stage
    setTimeout(() => {
      const testInterval = setInterval(() => {
        setTestProgress((prev) => {
          if (prev >= 100) {
            clearInterval(testInterval);
            setPipelineStage("deploy");
            return 100;
          }
          return prev + 4;
        });
      }, 40);
    }, 2000);

    // Deploy stage
    setTimeout(() => {
      const deployInterval = setInterval(() => {
        setDeployProgress((prev) => {
          if (prev >= 100) {
            clearInterval(deployInterval);
            setPipelineStage("complete");
            return 100;
          }
          return prev + 5;
        });
      }, 30);
    }, 4000);

    // Animate checks
    mockChecks.forEach((check, index) => {
      setTimeout(() => {
        setChecks((prev) => [...prev, { ...check, status: "running" }]);
      }, 1500 + (index * 400));

      setTimeout(() => {
        setChecks((prev) =>
          prev.map((c) =>
            c.name === check.name ? { ...c, status: "passed" } : c
          )
        );
      }, 2500 + (index * 400));
    });

    return () => {
      clearInterval(buildInterval);
    };
  }, []);

  return (
    <div className="h-full flex gap-4">
      {/* Deployment Pipeline */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-96 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 flex flex-col"
      >
        <div className="mb-4 flex items-center gap-2">
          <Rocket className="h-5 w-5 text-[#8B7FE8]" />
          <h3 className="text-[14px] font-semibold text-[#F4F3EF]">
            Deployment Pipeline
          </h3>
        </div>

        {/* Pipeline Stages */}
        <div className="flex-1 space-y-4">
          {[
            { stage: "build", label: "Build", progress: buildProgress },
            { stage: "test", label: "Test", progress: testProgress },
            { stage: "deploy", label: "Deploy", progress: deployProgress },
          ].map((item) => (
            <div key={item.stage}>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {pipelineStage === item.stage && item.progress < 100 ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8B7FE8]" />
                  ) : item.progress >= 100 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#22A67D]" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-white/[0.2]" />
                  )}
                  <span className="text-[12px] text-[#F4F3EF]">{item.label}</span>
                </div>
                <span className="text-[11px] text-[#55575F]">{item.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                <motion.div
                  className="h-full rounded-full bg-[#8B7FE8]"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Deployment Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={`mt-4 rounded-xl border p-4 ${
            pipelineStage === "complete"
              ? "border-[#22A67D]/30 bg-[#22A67D]/10"
              : "border-white/[0.06] bg-white/[0.02]"
          }`}
        >
          <div className="flex items-center gap-2">
            {pipelineStage === "complete" ? (
              <CheckCircle2 className="h-5 w-5 text-[#22A67D]" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-[#8B7FE8]" />
            )}
            <div>
              <p className="text-[13px] font-semibold text-[#F4F3EF]">
                {pipelineStage === "complete" ? "Deployment Successful" : "Deploying..."}
              </p>
              <p className="text-[11px] text-[#55575F]">
                {pipelineStage === "complete"
                  ? "Production is now healthy"
                  : "Running deployment pipeline"}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Checks & Status */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
      >
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-[#8B7FE8]" />
          <h3 className="text-[14px] font-semibold text-[#F4F3EF]">
            CI/CD Checks
          </h3>
        </div>

        {/* Checks List */}
        <div className="space-y-2 mb-6">
          {checks.map((check, index) => (
            <motion.div
              key={check.name}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
            >
              {check.status === "running" && (
                <Loader2 className="h-4 w-4 animate-spin text-[#8B7FE8]" />
              )}
              {check.status === "passed" && (
                <CheckCircle2 className="h-4 w-4 text-[#22A67D]" />
              )}
              {check.status === "pending" && (
                <div className="h-4 w-4 rounded-full border-2 border-white/[0.2]" />
              )}
              <span className="text-[12px] text-[#F4F3EF]">{check.name}</span>
              <span className="ml-auto text-[11px] text-[#55575F] capitalize">
                {check.status}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Production Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2 }}
          className="rounded-xl border border-[#22A67D]/20 bg-[#22A67D]/5 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Server className="h-4 w-4 text-[#22A67D]" />
            <span className="text-[12px] font-semibold text-[#22A67D]">
              Production Status
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Health", value: "Healthy" },
              { label: "Uptime", value: "99.9%" },
              { label: "Version", value: "v2.4.1" },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 2.2 + (index * 0.1) }}
                className="rounded-lg bg-[#0A0B0D] p-2 text-center"
              >
                <p className="text-[10px] text-[#55575F]">{stat.label}</p>
                <p className="mt-1 text-[11px] font-semibold text-[#22A67D]">{stat.value}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Deployment Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3 }}
          className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
        >
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#55575F]">Tests Run</span>
            <span className="text-[#F4F3EF]">156 passed</span>
          </div>
          <div className="flex items-center justify-between text-[11px] mt-2">
            <span className="text-[#55575F]">Build Time</span>
            <span className="text-[#F4F3EF]">2m 34s</span>
          </div>
          <div className="flex items-center justify-between text-[11px] mt-2">
            <span className="text-[#55575F]">Deploy Time</span>
            <span className="text-[#F4F3EF]">45s</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
