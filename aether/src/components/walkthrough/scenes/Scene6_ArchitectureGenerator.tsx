import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Network, Database, Server, Activity, Zap, CheckCircle2 } from "lucide-react";

export default function Scene6_ArchitectureGenerator() {
  const [generationProgress, setGenerationProgress] = useState(0);
  const [nodes, setNodes] = useState<Array<{
    id: string;
    name: string;
    x: string;
    y: string;
    icon: "database" | "server" | "api" | "worker" | "queue" | "realtime";
  }>>([]);

  const nodeConfig = [
    { id: "1", name: "API Gateway", x: "50%", y: "15%", icon: "api" as const },
    { id: "2", name: "Auth Service", x: "25%", y: "35%", icon: "server" as const },
    { id: "3", name: "Database", x: "50%", y: "55%", icon: "database" as const },
    { id: "4", name: "Worker", x: "75%", y: "35%", icon: "worker" as const },
    { id: "5", name: "Queue", x: "25%", y: "75%", icon: "queue" as const },
    { id: "6", name: "Realtime", x: "75%", y: "75%", icon: "realtime" as const },
  ];

  const iconMap = {
    database: Database,
    server: Server,
    api: Activity,
    worker: Zap,
    queue: Activity,
    realtime: Zap,
  };

  useEffect(() => {
    // Animate generation progress
    const genInterval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(genInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 40);

    // Reveal nodes progressively
    nodeConfig.forEach((node, index) => {
      setTimeout(() => {
        setNodes((prev) => [...prev, node]);
      }, 500 + (index * 600));
    });

    return () => clearInterval(genInterval);
  }, []);

  return (
    <div className="h-full flex gap-4">
      {/* Architecture Canvas */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 relative overflow-hidden"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-[#8B7FE8]" />
            <h3 className="text-[14px] font-semibold text-[#F4F3EF]">
              Architecture Diagram
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {generationProgress < 100 ? (
              <Zap className="h-4 w-4 text-[#8B7FE8] animate-pulse" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-[#22A67D]" />
            )}
            <span className="text-[11px] text-[#55575F]">
              {generationProgress}%
            </span>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative h-[calc(100%-60px)] rounded-xl border border-white/[0.06] bg-[#0A0B0D]">
          {/* Background Grid */}
          <div className="absolute inset-0 opacity-10">
            <div className="grid grid-cols-12 grid-rows-8 h-full">
              {Array.from({ length: 96 }).map((_, i) => (
                <div key={i} className="border border-white/[0.1]" />
              ))}
            </div>
          </div>

          {/* Connection Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {nodes.length >= 2 && (
              <>
                {/* API Gateway to Auth */}
                {nodes.find((n) => n.id === "1") && nodes.find((n) => n.id === "2") && (
                  <motion.line
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    x1="50%"
                    y1="15%"
                    x2="25%"
                    y2="35%"
                    stroke="#8B7FE8"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                )}
                {/* API Gateway to Worker */}
                {nodes.find((n) => n.id === "1") && nodes.find((n) => n.id === "4") && (
                  <motion.line
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.5 }}
                    x1="50%"
                    y1="15%"
                    x2="75%"
                    y2="35%"
                    stroke="#8B7FE8"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                )}
                {/* Auth to Database */}
                {nodes.find((n) => n.id === "2") && nodes.find((n) => n.id === "3") && (
                  <motion.line
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2 }}
                    x1="25%"
                    y1="35%"
                    x2="50%"
                    y2="55%"
                    stroke="#22A67D"
                    strokeWidth="2"
                  />
                )}
                {/* Worker to Queue */}
                {nodes.find((n) => n.id === "4") && nodes.find((n) => n.id === "5") && (
                  <motion.line
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 3.5 }}
                    x1="75%"
                    y1="35%"
                    x2="25%"
                    y2="75%"
                    stroke="#F0A35E"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                )}
                {/* Worker to Realtime */}
                {nodes.find((n) => n.id === "4") && nodes.find((n) => n.id === "6") && (
                  <motion.line
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 4 }}
                    x1="75%"
                    y1="35%"
                    x2="75%"
                    y2="75%"
                    stroke="#22A67D"
                    strokeWidth="2"
                  />
                )}
              </>
            )}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => {
            const Icon = iconMap[node.icon];
            return (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute rounded-xl border border-[#8B7FE8]/30 bg-[#8B7FE8]/10 px-4 py-3"
                style={{
                  left: node.x,
                  top: node.y,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[#A69DF0]" />
                  <span className="text-[11px] font-medium text-[#F4F3EF]">
                    {node.name}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Architecture Details */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-72 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 flex flex-col"
      >
        <h3 className="mb-4 text-[14px] font-semibold text-[#F4F3EF]">
          Components
        </h3>

        <div className="flex-1 space-y-3">
          {nodeConfig.map((node, index) => {
            const Icon = iconMap[node.icon];
            const isVisible = nodes.find((n) => n.id === node.id);
            return (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + (index * 0.3) }}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-all ${
                  isVisible
                    ? "border-[#8B7FE8]/30 bg-[#8B7FE8]/10"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                <Icon className={`h-4 w-4 ${isVisible ? "text-[#8B7FE8]" : "text-[#55575F]"}`} />
                <span className={`text-[12px] ${isVisible ? "text-[#F4F3EF]" : "text-[#55575F]"}`}>
                  {node.name}
                </span>
                {isVisible && (
                  <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-[#22A67D]" />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3 }}
          className="mt-4 pt-4 border-t border-white/[0.06]"
        >
          <p className="mb-2 text-[11px] font-medium text-[#55575F]">Legend</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 bg-[#8B7FE8]" />
              <span className="text-[10px] text-[#94969E]">API Flow</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 bg-[#22A67D]" />
              <span className="text-[10px] text-[#94969E]">Data Flow</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 bg-[#F0A35E] border-dashed border-2 border-[#F0A35E]" />
              <span className="text-[10px] text-[#94969E]">Async Flow</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
