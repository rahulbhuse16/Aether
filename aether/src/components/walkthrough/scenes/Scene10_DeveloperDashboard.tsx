import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, GitPullRequest, Bug, Rocket, Zap, Activity, TrendingUp, Users } from "lucide-react";

export default function Scene10_DeveloperDashboard() {
  const [metrics, setMetrics] = useState({
    repoHealth: 0,
    prsReviewed: 0,
    issuesFixed: 0,
    deployments: 0,
    productivityScore: 0,
    aiUsage: 0,
  });

  const [activityFeed, setActivityFeed] = useState<Array<{
    icon: string;
    text: string;
    time: string;
  }>>([]);

  const mockActivities = [
    { icon: "pr", text: "PR #234 approved by AI", time: "Just now" },
    { icon: "bug", text: "Security issue fixed", time: "2 min ago" },
    { icon: "deploy", text: "Production deployed", time: "5 min ago" },
    { icon: "commit", text: "12 commits pushed", time: "10 min ago" },
    { icon: "review", text: "Code review completed", time: "15 min ago" },
  ];

  useEffect(() => {
    // Animate metrics
    const metricsInterval = setInterval(() => {
      setMetrics((prev) => ({
        repoHealth: prev.repoHealth < 98 ? prev.repoHealth + 2 : 98,
        prsReviewed: prev.prsReviewed < 23 ? prev.prsReviewed + 1 : 23,
        issuesFixed: prev.issuesFixed < 15 ? prev.issuesFixed + 1 : 15,
        deployments: prev.deployments < 12 ? prev.deployments + 1 : 12,
        productivityScore: prev.productivityScore < 95 ? prev.productivityScore + 2 : 95,
        aiUsage: prev.aiUsage < 87 ? prev.aiUsage + 2 : 87,
      }));
    }, 100);

    // Add activities progressively
    mockActivities.forEach((activity, index) => {
      setTimeout(() => {
        setActivityFeed((prev) => [...prev, activity]);
      }, 500 + (index * 600));
    });

    return () => clearInterval(metricsInterval);
  }, []);

  const statCards = [
    {
      icon: BarChart3,
      label: "Repository Health",
      value: `${metrics.repoHealth}%`,
      color: "text-[#22A67D]",
      bg: "bg-[#22A67D]/10",
    },
    {
      icon: GitPullRequest,
      label: "PRs Reviewed",
      value: `${metrics.prsReviewed} this week`,
      color: "text-[#8B7FE8]",
      bg: "bg-[#8B7FE8]/10",
    },
    {
      icon: Bug,
      label: "Issues Fixed",
      value: metrics.issuesFixed,
      color: "text-[#F0A35E]",
      bg: "bg-[#F0A35E]/10",
    },
    {
      icon: Rocket,
      label: "Deployments",
      value: metrics.deployments,
      color: "text-[#E8877F]",
      bg: "bg-[#E8877F]/10",
    },
    {
      icon: Zap,
      label: "Productivity Score",
      value: metrics.productivityScore >= 90 ? "A+" : "A",
      color: "text-[#22A67D]",
      bg: "bg-[#22A67D]/10",
    },
    {
      icon: Activity,
      label: "AI Usage",
      value: `${metrics.aiUsage}%`,
      color: "text-[#8B7FE8]",
      bg: "bg-[#8B7FE8]/10",
    },
  ];

  const iconMap: Record<string, React.ReactNode> = {
    pr: <GitPullRequest className="h-3.5 w-3.5 text-[#8B7FE8]" />,
    bug: <Bug className="h-3.5 w-3.5 text-[#F0A35E]" />,
    deploy: <Rocket className="h-3.5 w-3.5 text-[#22A67D]" />,
    commit: <Activity className="h-3.5 w-3.5 text-[#8B7FE8]" />,
    review: <BarChart3 className="h-3.5 w-3.5 text-[#A69DF0]" />,
  };

  return (
    <div className="h-full flex gap-4">
      {/* Main Dashboard */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
      >
        <div className="mb-6 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[#8B7FE8]" />
          <h3 className="text-[14px] font-semibold text-[#F4F3EF]">
            Developer Dashboard
          </h3>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * index }}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
                <p className="mt-3 text-[11px] text-[#55575F]">{card.label}</p>
                <p className={`mt-1 text-[20px] font-semibold ${card.color}`}>
                  {card.value}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Knowledge Graph */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-[#8B7FE8]" />
            <span className="text-[12px] font-semibold text-[#F4F3EF]">
              Knowledge Graph
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { name: "GitHub", connections: 234 },
              { name: "Slack", connections: 89 },
              { name: "Notion", connections: 56 },
              { name: "Jira", connections: 45 },
            ].map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + (index * 0.1) }}
                className="rounded-lg border border-[#8B7FE8]/20 bg-[#8B7FE8]/5 p-3 text-center"
              >
                <p className="text-[11px] font-medium text-[#A69DF0]">{item.name}</p>
                <p className="mt-1 text-[14px] font-semibold text-[#F4F3EF]">
                  {item.connections}
                </p>
                <p className="text-[10px] text-[#55575F]">connections</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Live Activity Feed */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-80 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 flex flex-col"
      >
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-[#8B7FE8]" />
          <h3 className="text-[14px] font-semibold text-[#F4F3EF]">
            Live Activity
          </h3>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto">
          {activityFeed.map((activity, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                {iconMap[activity.icon]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-[#F4F3EF]">{activity.text}</p>
                <p className="text-[10px] text-[#55575F]">{activity.time}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Live Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-4 flex items-center gap-2 rounded-lg border border-[#22A67D]/20 bg-[#22A67D]/5 px-3 py-2"
        >
          <div className="relative">
            <div className="h-2 w-2 rounded-full bg-[#22A67D]" />
            <div className="absolute inset-0 h-2 w-2 animate-ping rounded-full bg-[#22A67D]" />
          </div>
          <span className="text-[11px] text-[#22A67D]">Live updates active</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
