import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  GitPullRequest,
  ListChecks,
  Bug,
  BarChart3,
  ArrowUpRight,
  Send,
  Sparkles,
} from "lucide-react";
import { FaSlack, FaGithub } from "react-icons/fa";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  fetchAetherSlackFeed,
  sendDailySummaryNow,
} from "../store/slices/slackSyncSlice";
import type { Priority } from "../services/slack-sync";

const PRIORITY_STYLES: Record<Priority, string> = {
  high: "bg-[#E8877F]/15 text-[#E8877F]",
  medium: "bg-[#8B7FE8]/15 text-[#8B7FE8]",
  low: "bg-white/[0.06] text-[#94969E]",
};

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${PRIORITY_STYLES[priority]}`}
    >
      {priority}
    </span>
  );
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AetherActivity() {
  const dispatch = useAppDispatch();
  const userId = localStorage.getItem("userId") as string;

  const {
    mentions,
    tasks,
    bugAnalyses,
    githubNotifications,
    dailySummary,
    status,
    sendSummaryStatus,
  } = useAppSelector((s) => s.aetherSlack);

   const { activeChannelId } = useAppSelector(
    (s) => s.slackChat
  );

  useEffect(() => {
    if (userId) dispatch(fetchAetherSlackFeed(userId));
  }, [dispatch, userId]);

  return (
    <AppShell title="Aether Activity">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center gap-2 text-[12px] text-[#55575F]">
         <PageSection
    label="Intelligence"
    title="Slack AI"
  >
    <GlassCard>
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#8B7FE8] to-[#36C5F0] text-white">
          <Sparkles className="h-6 w-6" />
        </div>

        <div className="flex-1">
          <p className="text-[15px] font-medium text-[#F4F3EF]">
            Aether AI for Slack
          </p>

          <p className="text-[13px] text-[#94969E]">
            Ask questions, summarize conversations, analyze discussions,
            and get AI-powered insights from your Slack workspace.
          </p>
        </div>

       
      </div>
    </GlassCard>
  </PageSection>
          {status === "failed" && (
            <span className="ml-auto text-[#E8877F]">
              Couldn't refresh — showing last known activity.
            </span>
          )}
        </div>

        {/* AI teammate mentions */}
        <PageSection label="AI teammate" title="@Aether mentions">
          <div className="space-y-2">
            {mentions.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
              >
                <GlassCard className="py-4">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#8B7FE8] to-[#22A67D] text-[#0A0B0D]">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[#F4F3EF]">
                        {m.userName} in #{m.channel}
                      </p>
                      <p className="text-[11px] text-[#55575F]">{timeAgo(m.timestamp)}</p>
                    </div>
                    {m.confidence && (
                      <span className="ml-auto text-[11px] text-[#94969E]">
                        {m.confidence}% confidence
                      </span>
                    )}
                  </div>
                  <p className="mb-2 text-[13px] text-[#94969E]">{m.question}</p>
                  <p className="rounded-lg bg-white/[0.03] p-3 text-[13.5px] leading-snug text-[#DADBE1]">
                    {m.response}
                  </p>
                  {m.relatedGithubIssue && (
                    <p className="mt-2 text-[11px] text-[#55575F]">
                      Related: {m.relatedGithubIssue}
                    </p>
                  )}
                </GlassCard>
              </motion.div>
            ))}
            {mentions.length === 0 && (
              <GlassCard className="py-6 text-center text-[13px] text-[#94969E]">
                No @Aether mentions yet. Try it in Slack: “@Aether analyze issue #123”.
              </GlassCard>
            )}
          </div>
        </PageSection>

        {/* GitHub -> Slack notifications */}
        <PageSection label="GitHub → Slack" title="Notifications sent" delay={0.05}>
          <div className="space-y-2">
            {githubNotifications.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
              >
                <GlassCard className="py-4">
                  <div className="mb-2 flex items-center gap-2">
                    <FaGithub className="h-4 w-4 text-[#94969E]" />
                    <p className="text-[13.5px] font-medium text-[#F4F3EF]">
                      {n.issueTitle}
                    </p>
                    <PriorityBadge priority={n.priority} />
                    <span className="ml-auto text-[11px] text-[#55575F]">
                      {timeAgo(n.timestamp)}
                    </span>
                  </div>
                  <p className="mb-1 text-[12px] text-[#94969E]">
                    {n.repository} · assigned to {n.assignedTo}
                  </p>
                  <p className="rounded-lg bg-white/[0.03] p-3 text-[13px] leading-snug text-[#DADBE1]">
                    {n.aiAnalysis}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <a href={n.aetherUrl}>
                      <Button size="sm" variant="ghost">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        Open in Aether
                      </Button>
                    </a>
                    <a href={n.githubUrl} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="ghost">
                        <FaGithub className="h-3.5 w-3.5" />
                        Open GitHub
                      </Button>
                    </a>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
            {githubNotifications.length === 0 && (
              <GlassCard className="py-6 text-center text-[13px] text-[#94969E]">
                No GitHub activity has been posted to Slack yet.
              </GlassCard>
            )}
          </div>
        </PageSection>

        {/* Tasks created from Slack */}
        <PageSection label="Tasks" title="Created from Slack" delay={0.1}>
          <div className="space-y-2">
            {tasks.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
              >
                <GlassCard className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                      <ListChecks className="h-4 w-4 text-[#F4F3EF]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[#F4F3EF]">{t.title}</p>
                      <p className="text-[11px] text-[#55575F]">
                        via Slack · {t.createdBy} · {timeAgo(t.createdAt)}
                      </p>
                    </div>
                  </div>
                  <PriorityBadge priority={t.priority} />
                </GlassCard>
              </motion.div>
            ))}
            {tasks.length === 0 && (
              <GlassCard className="py-6 text-center text-[13px] text-[#94969E]">
                No tasks created from Slack yet. Try “@Aether create a task: ...”.
              </GlassCard>
            )}
          </div>
        </PageSection>

        {/* Bug analyses */}
        <PageSection label="Bug finder" title="Pasted errors, analyzed" delay={0.15}>
          <div className="space-y-2">
            {bugAnalyses.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i }}
              >
                <GlassCard className="py-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Bug className="h-4 w-4 text-[#E8877F]" />
                    <p className="text-[13px] text-[#94969E]">
                      {b.userName} in #{b.channel}
                    </p>
                    <span className="ml-auto text-[11px] text-[#55575F]">
                      {b.confidence}% confidence
                    </span>
                  </div>
                  <p className="mb-2 rounded-lg bg-white/[0.03] p-3 font-mono text-[12.5px] text-[#E8877F]">
                    {b.errorSnippet}
                  </p>
                  <p className="text-[13px] text-[#DADBE1]">
                    <span className="text-[#94969E]">Root cause: </span>
                    {b.rootCause}
                  </p>
                  <p className="mt-1 text-[13px] text-[#DADBE1]">
                    <span className="text-[#94969E]">Fix: </span>
                    {b.recommendedFix}
                  </p>
                </GlassCard>
              </motion.div>
            ))}
            {bugAnalyses.length === 0 && (
              <GlassCard className="py-6 text-center text-[13px] text-[#94969E]">
                Paste an error after @Aether in Slack to get a root-cause analysis.
              </GlassCard>
            )}
          </div>
        </PageSection>

        {/* Daily engineering summary */}
        <PageSection label="Daily summary" title="Engineering intelligence" delay={0.2}>
          <GlassCard highlight>
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#22A67D]" />
              <span className="text-[14px] font-medium text-[#F4F3EF]">
                {dailySummary
                  ? new Date(dailySummary.date).toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })
                  : "No summary yet"}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto"
                onClick={() => dispatch(sendDailySummaryNow({userId,
                  channelId:activeChannelId
                }))}
                disabled={sendSummaryStatus === "sending"}
              >
                <Send className="h-3.5 w-3.5" />
                {sendSummaryStatus === "sending" ? "Sending…" : "Send to Slack"}
              </Button>
            </div>

            {dailySummary && (
              <>
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {[
                    { label: "Opened", value: dailySummary.githubOpened },
                    { label: "Closed", value: dailySummary.githubClosed },
                    { label: "High-priority bugs", value: dailySummary.highPriorityBugs },
                    { label: "Tasks done", value: dailySummary.tasksCompleted },
                    { label: "Overdue", value: dailySummary.tasksOverdue },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-center"
                    >
                      <p className="text-[18px] font-medium text-[#F4F3EF]">{stat.value}</p>
                      <p className="text-[10.5px] text-[#94969E]">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {dailySummary.insights.map((insight, idx) => (
                  <p key={idx} className="mb-2 text-[13px] text-[#DADBE1]">
                    <span className="mr-1">⚠️</span>
                    {insight}
                  </p>
                ))}

                <p className="mt-2 rounded-lg bg-white/[0.03] p-3 text-[13px] text-[#DADBE1]">
                  <span className="mr-1">🔥</span>
                  <span className="text-[#94969E]">Recommended: </span>
                  {dailySummary.recommendedAction}
                </p>
              </>
            )}

            {sendSummaryStatus === "sent" && (
              <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[#22A67D]">
                <GitPullRequest className="h-3.5 w-3.5" />
                Summary sent to Slack.
              </p>
            )}
          </GlassCard>
        </PageSection>
      </div>
    </AppShell>
  );
}