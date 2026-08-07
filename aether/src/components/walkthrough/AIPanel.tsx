import { motion } from "framer-motion";
import { Sparkles, Loader2, CheckCircle2, FileText, GitBranch } from "lucide-react";
import type { SceneType } from "../pages/LiveWalkthroughPage";

interface AIPanelProps {
  currentScene: SceneType;
}

const SCENE_AI_CONTENT: Record<SceneType, {
  title: string;
  status: "thinking" | "streaming" | "complete";
  content: string[];
  sources?: Array<{ type: string; name: string }>;
}> = {
  1: {
    title: "Analyzing Repository",
    status: "streaming",
    content: [
      "Scanning repository structure...",
      "Indexing 234 files across 18 directories",
      "Identifying 12 services and 45 dependencies",
      "Repository health: 94% → 100%"
    ],
    sources: [
      { type: "repo", name: "main-branch" },
      { type: "file", name: "package.json" }
    ]
  },
  2: {
    title: "Understanding Codebase",
    status: "thinking",
    content: [
      "Building dependency graph...",
      "Mapping service relationships...",
      "Analyzing architecture patterns...",
      "Codebase fully understood"
    ],
    sources: [
      { type: "service", name: "auth-service" },
      { type: "service", name: "api-gateway" }
    ]
  },
  3: {
    title: "Explaining Authentication Flow",
    status: "streaming",
    content: [
      "The authentication flow uses JWT tokens...",
      "Request → API Gateway → Auth Service",
      "Token validation happens at middleware layer",
      "Session stored in Redis with 24h TTL"
    ],
    sources: [
      { type: "file", name: "auth/middleware.ts" },
      { type: "file", name: "auth/jwt.ts" }
    ]
  },
  4: {
    title: "Scanning for Bugs",
    status: "thinking",
    content: [
      "Running static analysis...",
      "Checking for security vulnerabilities...",
      "Analyzing code patterns...",
      "3 potential issues found"
    ],
    sources: [
      { type: "file", name: "user/controller.ts" },
      { type: "file", name: "api/routes.ts" }
    ]
  },
  5: {
    title: "Reviewing Pull Request",
    status: "streaming",
    content: [
      "Analyzing code changes...",
      "Performance: No issues detected",
      "Security: 1 warning (input validation)",
      "Accessibility: All checks passed",
      "Recommendation: Approve"
    ],
    sources: [
      { type: "pr", name: "#234 - Add user profile" }
    ]
  },
  6: {
    title: "Generating Architecture",
    status: "streaming",
    content: [
      "Mapping service connections...",
      "Identifying data flows...",
      "Building component relationships...",
      "Architecture diagram complete"
    ],
    sources: []
  },
  7: {
    title: "Summarizing Discussion",
    status: "streaming",
    content: [
      "Engineering team discussed API rate limiting...",
      "Decision: Implement tiered rate limits",
      "Action items assigned to backend team",
      "Timeline: 2 weeks"
    ],
    sources: [
      { type: "slack", name: "#engineering" }
    ]
  },
  8: {
    title: "Updating Documentation",
    status: "complete",
    content: [
      "Extracted 8 tasks from requirements...",
      "Updated API documentation",
      "Synchronized architecture notes",
      "Documentation updated successfully"
    ],
    sources: [
      { type: "notion", name: "Requirements v2.0" }
    ]
  },
  9: {
    title: "Monitoring Deployment",
    status: "streaming",
    content: [
      "Running test suite...",
      "Tests: 156 passed, 0 failed",
      "Build: Success",
      "Deploying to production...",
      "Deployment successful"
    ],
    sources: [
      { type: "deploy", name: "production" }
    ]
  },
  10: {
    title: "Dashboard Overview",
    status: "complete",
    content: [
      "Repository Health: 98%",
      "PRs Reviewed: 23 this week",
      "Issues Fixed: 15",
      "Deployments: 12 successful",
      "Productivity Score: A+"
    ],
    sources: []
  }
};

export default function AIPanel({ currentScene }: AIPanelProps) {
  const content = SCENE_AI_CONTENT[currentScene];

  return (
    <motion.aside
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-80 border-l border-white/[0.08] bg-[#0A0B0D]/50 backdrop-blur-sm"
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-white/[0.08] p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8B7FE8]/10">
              <Sparkles className="h-4 w-4 text-[#8B7FE8]" />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-[#F4F3EF]">
                Aether AI
              </h3>
              <div className="flex items-center gap-1.5">
                {content.status === "thinking" && (
                  <Loader2 className="h-3 w-3 animate-spin text-[#8B7FE8]" />
                )}
                {content.status === "streaming" && (
                  <div className="flex gap-0.5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8B7FE8]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8B7FE8] delay-75" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8B7FE8] delay-150" />
                  </div>
                )}
                {content.status === "complete" && (
                  <CheckCircle2 className="h-3 w-3 text-[#22A67D]" />
                )}
                <span className="text-[11px] text-[#55575F] capitalize">
                  {content.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <h4 className="text-[13px] font-medium text-[#F4F3EF]">
            {content.title}
          </h4>
          {content.content.map((line, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.2 }}
              className="flex items-start gap-2 text-[12px] text-[#94969E]"
            >
              <div className="mt-1.5 h-1 w-1 rounded-full bg-[#8B7FE8]" />
              <span>{line}</span>
            </motion.div>
          ))}

          {/* Sources */}
          {content.sources && content.sources.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <p className="mb-2 text-[11px] font-medium text-[#55575F]">
                Context Sources
              </p>
              <div className="space-y-1.5">
                {content.sources.map((source, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + (index * 0.1) }}
                    className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    {source.type === "repo" && <GitBranch className="h-3.5 w-3.5 text-[#8B7FE8]" />}
                    {source.type === "file" && <FileText className="h-3.5 w-3.5 text-[#22A67D]" />}
                    {source.type === "service" && <Sparkles className="h-3.5 w-3.5 text-[#F0A35E]" />}
                    <span className="text-[11px] text-[#94969E]">{source.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
