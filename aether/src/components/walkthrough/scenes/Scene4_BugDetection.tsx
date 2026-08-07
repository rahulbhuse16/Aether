import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Shield, FileText, X, CheckCircle2, Zap } from "lucide-react";

export default function Scene4_BugDetection() {
  const [scanProgress, setScanProgress] = useState(0);
  const [bugsFound, setBugsFound] = useState<Array<{
    id: string;
    file: string;
    severity: "critical" | "high" | "medium";
    description: string;
  }>>([]);
  const [selectedBug, setSelectedBug] = useState<string | null>(null);

  const mockBugs = [
    {
      id: "1",
      file: "user/controller.ts",
      severity: "critical" as const,
      description: "SQL injection vulnerability in user query",
    },
    {
      id: "2",
      file: "api/routes.ts",
      severity: "high" as const,
      description: "Missing rate limiting on public endpoints",
    },
    {
      id: "3",
      file: "auth/middleware.ts",
      severity: "medium" as const,
      description: "Token expiration not properly validated",
    },
  ];

  useEffect(() => {
    // Animate scan progress
    const scanInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(scanInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 40);

    // Reveal bugs progressively
    mockBugs.forEach((bug, index) => {
      setTimeout(() => {
        setBugsFound((prev) => [...prev, bug]);
      }, 1500 + (index * 800));
    });

    // Auto-select first bug
    setTimeout(() => {
      setSelectedBug("1");
    }, 3500);

    return () => clearInterval(scanInterval);
  }, []);

  const severityColors = {
    critical: "bg-[#E8877F]/10 border-[#E8877F]/30 text-[#E8877F]",
    high: "bg-[#F0A35E]/10 border-[#F0A35E]/30 text-[#F0A35E]",
    medium: "bg-[#22A67D]/10 border-[#22A67D]/30 text-[#22A67D]",
  };

  return (
    <div className="h-full flex gap-4">
      {/* Bug Scanner */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-96 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 flex flex-col"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#8B7FE8]" />
            <h3 className="text-[14px] font-semibold text-[#F4F3EF]">
              Bug Scanner
            </h3>
          </div>
          <span className="text-[11px] text-[#55575F]">
            {bugsFound.length} found
          </span>
        </div>

        {/* Scan Progress */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] text-[#94969E]">Scanning project...</span>
            <span className="text-[12px] font-medium text-[#F4F3EF]">
              {scanProgress}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
            <motion.div
              className="h-full rounded-full bg-[#8B7FE8]"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        </div>

        {/* Bug List */}
        <div className="flex-1 space-y-2 overflow-y-auto">
          {bugsFound.map((bug, index) => (
            <motion.div
              key={bug.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              onClick={() => setSelectedBug(bug.id)}
              className={`cursor-pointer rounded-lg border p-3 transition-all ${
                selectedBug === bug.id
                  ? "border-[#8B7FE8] bg-[#8B7FE8]/10"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-[#F0A35E]" />
                    <span className="text-[11px] font-medium text-[#F4F3EF]">
                      {bug.file}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94969E] line-clamp-2">
                    {bug.description}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium capitalize ${
                    severityColors[bug.severity]
                  }`}
                >
                  {bug.severity}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Bug Details */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
      >
        {selectedBug ? (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-[#8B7FE8]" />
                <div>
                  <h3 className="text-[14px] font-semibold text-[#F4F3EF]">
                    {mockBugs.find((b) => b.id === selectedBug)?.file}
                  </h3>
                  <p className="text-[11px] text-[#55575F]">
                    Line 42-58
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBug(null)}
                className="rounded-lg p-1.5 text-[#55575F] transition-colors hover:text-[#F4F3EF]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Code Preview */}
            <div className="mb-6 rounded-xl border border-white/[0.08] bg-[#0A0B0D] p-4 font-mono">
              <div className="space-y-1">
                <div className="flex">
                  <span className="w-8 text-[11px] text-[#55575F]">42</span>
                  <span className="text-[11px] text-[#94969E]">
                    const query = "SELECT * FROM users WHERE id = " + userId
                  </span>
                </div>
                <div className="flex">
                  <span className="w-8 text-[11px] text-[#55575F]">43</span>
                  <span className="text-[11px] text-[#94969E]">
                    const result = await db.execute(query)
                  </span>
                </div>
                <div className="flex">
                  <span className="w-8 text-[11px] text-[#55575F]">44</span>
                  <span className="text-[11px] text-[#94969E]">
                    return result
                  </span>
                </div>
              </div>

              {/* Highlight */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-3 rounded bg-[#E8877F]/10 border border-[#E8877F]/30 p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-[#E8877F]" />
                  <span className="text-[11px] font-medium text-[#E8877F]">
                    SQL Injection Vulnerability
                  </span>
                </div>
                <p className="text-[11px] text-[#94969E]">
                  User input is directly interpolated into SQL query without sanitization
                </p>
              </motion.div>
            </div>

            {/* AI Explanation */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl border border-[#8B7FE8]/20 bg-[#8B7FE8]/5 p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-[#8B7FE8]" />
                <span className="text-[12px] font-semibold text-[#A69DF0]">
                  AI Analysis
                </span>
              </div>
              <p className="text-[12px] text-[#94969E] leading-relaxed">
                This vulnerability allows attackers to execute arbitrary SQL commands by
                manipulating the userId parameter. Use parameterized queries or an ORM
                to prevent injection attacks.
              </p>
            </motion.div>

            {/* Suggested Fix */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-4 rounded-xl border border-[#22A67D]/20 bg-[#22A67D]/5 p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-[#22A67D]" />
                <span className="text-[12px] font-semibold text-[#22A67D]">
                  Suggested Fix
                </span>
              </div>
              <div className="rounded-lg bg-[#0A0B0D] p-3 font-mono text-[11px] text-[#94969E]">
                <pre>{`const result = await db.query(
  'SELECT * FROM users WHERE id = ?',
  [userId]
)`}</pre>
              </div>
            </motion.div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-[#55575F]">
            <p className="text-[13px]">Select a bug to view details</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
