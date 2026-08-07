import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Folder, FileText, Network, ChevronRight, ChevronDown, Sparkles, CheckCircle2 } from "lucide-react";

export default function Scene2_UnderstandingCodebase() {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [indexedFiles, setIndexedFiles] = useState(0);
  const [dependenciesBuilt, setDependenciesBuilt] = useState(0);
  const [architectureProgress, setArchitectureProgress] = useState(0);

  useEffect(() => {
    // Expand folders sequentially
    const folders = ["src", "components", "services", "utils"];
    folders.forEach((folder, index) => {
      setTimeout(() => {
        setExpandedFolders((prev) => new Set([...prev, folder]));
      }, 500 + (index * 400));
    });

    // Animate indexed files
    const filesInterval = setInterval(() => {
      setIndexedFiles((prev) => {
        if (prev >= 234) {
          clearInterval(filesInterval);
          return 234;
        }
        return prev + 5;
      });
    }, 30);

    // Animate dependencies
    const depsInterval = setInterval(() => {
      setDependenciesBuilt((prev) => {
        if (prev >= 45) {
          clearInterval(depsInterval);
          return 45;
        }
        return prev + 1;
      });
    }, 50);

    // Animate architecture progress
    const archInterval = setInterval(() => {
      setArchitectureProgress((prev) => {
        if (prev >= 100) {
          clearInterval(archInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 40);

    return () => {
      clearInterval(filesInterval);
      clearInterval(depsInterval);
      clearInterval(archInterval);
    };
  }, []);

  const folderTree = [
    {
      name: "src",
      children: [
        { name: "components", children: ["Button.tsx", "Card.tsx", "Input.tsx"] },
        { name: "services", children: ["auth.ts", "api.ts", "database.ts"] },
        { name: "utils", children: ["helpers.ts", "constants.ts"] },
      ],
    },
    {
      name: "config",
      children: ["webpack.config.js", "tsconfig.json"],
    },
  ];

  return (
    <div className="h-full flex gap-4">
      {/* File Tree */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-80 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-[#F4F3EF]">
            Project Structure
          </h3>
          <span className="text-[11px] text-[#55575F]">
            {indexedFiles} files
          </span>
        </div>

        <div className="space-y-1">
          {folderTree.map((folder, folderIndex) => (
            <div key={folder.name}>
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + (folderIndex * 0.3) }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-[#94969E] hover:bg-white/[0.04]"
              >
                {expandedFolders.has(folder.name) ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                <Folder className="h-3.5 w-3.5 text-[#8B7FE8]" />
                <span>{folder.name}</span>
              </motion.button>

              {expandedFolders.has(folder.name) && folder.children && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="ml-4 space-y-1"
                >
                  {folder.children.map((child, childIndex) => (
                    <motion.div
                      key={typeof child === "string" ? child : child.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + (folderIndex * 0.3) + (childIndex * 0.1) }}
                      className="flex items-center gap-2 px-2 py-1"
                    >
                      {typeof child === "string" ? (
                        <>
                          <FileText className="h-3 w-3 text-[#55575F]" />
                          <span className="text-[11px] text-[#94969E]">{child}</span>
                        </>
                      ) : (
                        <>
                          <Folder className="h-3 w-3 text-[#22A67D]" />
                          <span className="text-[11px] text-[#94969E]">{child.name}</span>
                        </>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Dependency Graph */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[#F4F3EF]">
              Dependency Graph
            </h3>
            <span className="text-[11px] text-[#55575F]">
              {dependenciesBuilt} dependencies
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { name: "React", color: "#8B7FE8" },
              { name: "TypeScript", color: "#22A67D" },
              { name: "Framer Motion", color: "#F0A35E" },
              { name: "TailwindCSS", color: "#E8877F" },
            ].map((dep, index) => (
              <motion.div
                key={dep.name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + (index * 0.1) }}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <div className="h-2 w-2 rounded-full mb-2" style={{ backgroundColor: dep.color }} />
                <p className="text-[11px] text-[#94969E]">{dep.name}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Architecture Visualization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[#F4F3EF]">
              Architecture Map
            </h3>
            <div className="flex items-center gap-2">
              {architectureProgress < 100 ? (
                <Sparkles className="h-4 w-4 text-[#8B7FE8] animate-pulse" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-[#22A67D]" />
              )}
              <span className="text-[11px] text-[#55575F]">
                {architectureProgress}%
              </span>
            </div>
          </div>

          {/* Architecture Nodes */}
          <div className="relative h-48">
            <div className="absolute inset-0 flex items-center justify-center">
              <Network className="h-32 w-32 text-[#8B7FE8]/20" />
            </div>

            {[
              { x: "20%", y: "30%", name: "API Gateway", delay: 0.6 },
              { x: "50%", y: "20%", name: "Auth Service", delay: 0.7 },
              { x: "80%", y: "30%", name: "Database", delay: 0.8 },
              { x: "30%", y: "60%", name: "Worker", delay: 0.9 },
              { x: "70%", y: "60%", name: "Queue", delay: 1.0 },
            ].map((node) => (
              <motion.div
                key={node.name}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: node.delay }}
                className="absolute rounded-lg border border-[#8B7FE8]/30 bg-[#8B7FE8]/10 px-3 py-2"
                style={{ left: node.x, top: node.y, transform: "translate(-50%, -50%)" }}
              >
                <p className="text-[10px] font-medium text-[#A69DF0]">{node.name}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
