import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Plus,
  ChevronDown,
  ChevronUp,
  Clock,
  GitCommit,
  Radio,
  Sparkles,
  Loader2,
  X,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  fetchIncidentsForProject,
  createIncident,
  updateIncidentStatusSeverity,
  analyzeIncident,
} from "../store/slices/incidentSlice";
import type {
  Incident,
  IncidentSeverity,
  IncidentStatus,
} from "../services/incident";

const SEVERITY_STYLES: Record<IncidentSeverity, string> = {
  critical: "bg-[#E8877F]/20 text-[#E8877F]",
  high: "bg-[#E8877F]/10 text-[#E8877F]",
  medium: "bg-[#8B7FE8]/15 text-[#8B7FE8]",
  low: "bg-white/[0.06] text-[#94969E]",
};

const STATUS_STYLES: Record<IncidentStatus, string> = {
  investigating: "bg-[#8B7FE8]/15 text-[#8B7FE8]",
  identified: "bg-white/[0.08] text-[#F4F3EF]",
  resolved: "bg-[#22A67D]/15 text-[#22A67D]",
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

function splitLines(text: string): string[] {
  return text
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function Incidents() {
  const dispatch = useAppDispatch();
  // ASSUMPTION: incidents are scoped under a project route, e.g.
  // /projects/:projectId/incidents. Adjust to however this page is
  // actually routed if that's not the case.
  const userId = localStorage.getItem("userId") as string;

  const { incidents, loading, creating, analyzing, error } = useAppSelector(
    (s) => s.incidents
  );

  const projectId=useAppSelector(state=>state.projects.currentRepoId)

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAnalyzeForm, setShowAnalyzeForm] = useState<string | null>(null);

  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createSeverity, setCreateSeverity] = useState<IncidentSeverity>("medium");

  const [errorDescription, setErrorDescription] = useState("");
  const [recentCommits, setRecentCommits] = useState("");
  const [deploymentsOrEvents, setDeploymentsOrEvents] = useState("");
  const [affectedServicesOrFiles, setAffectedServicesOrFiles] = useState("");

  useEffect(() => {
    if (userId && projectId) {
      dispatch(fetchIncidentsForProject({ userId, projectId }));
    }
  }, [ projectId]);

  const handleCreate = async () => {
    if (!createTitle.trim()) return;
    await dispatch(
      createIncident({
        userId,
        input: {
          projectId,
          title: createTitle.trim(),
          description: createDescription.trim() || undefined,
          severity: createSeverity,
        },
      })
    );
    setCreateTitle("");
    setCreateDescription("");
    setCreateSeverity("medium");
    setShowCreateForm(false);
  };

  const handleStatusChange = (incident: Incident, status: IncidentStatus) => {
    dispatch(
      updateIncidentStatusSeverity({ userId, incidentId: incident.id, updates: { status } })
    );
  };

  const handleSeverityChange = (incident: Incident, severity: IncidentSeverity) => {
    dispatch(
      updateIncidentStatusSeverity({ userId, incidentId: incident.id, updates: { severity } })
    );
  };

  const handleAnalyze = async (incident: Incident) => {
    await dispatch(
      analyzeIncident({
        userId,
        incidentId: incident.id,
        input: {
          errorDescription: errorDescription.trim() || undefined,
          recentCommits: splitLines(recentCommits),
          deploymentsOrEvents: splitLines(deploymentsOrEvents),
          affectedServicesOrFiles: splitLines(affectedServicesOrFiles),
        },
      })
    );
    setShowAnalyzeForm(null);
    setErrorDescription("");
    setRecentCommits("");
    setDeploymentsOrEvents("");
    setAffectedServicesOrFiles("");
  };

  return (
    <AppShell title="Incidents">
      <div className="mx-auto max-w-3xl space-y-8">
        <PageSection label="Incident Commander" title="Production incidents">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[12.5px] text-[#94969E]">
              {incidents.length} incident{incidents.length === 1 ? "" : "s"}
              {error && <span className="ml-2 text-[#E8877F]">· {error}</span>}
            </p>
            <Button size="sm" onClick={() => setShowCreateForm((v) => !v)}>
              <Plus className="h-3.5 w-3.5" />
              New Incident
            </Button>
          </div>

          <AnimatePresence>
            {showCreateForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 overflow-hidden"
              >
                <GlassCard className="space-y-3 py-4">
                  <input
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="Incident title — e.g. Production API returning 500"
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[13.5px] text-[#F4F3EF] placeholder:text-[#55575F] focus:border-[#8B7FE8]/40 focus:outline-none"
                  />
                  <textarea
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    rows={2}
                    placeholder="Brief description (optional)"
                    className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[13px] text-[#F4F3EF] placeholder:text-[#55575F] focus:border-[#8B7FE8]/40 focus:outline-none"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[#94969E]">Severity:</span>
                    <select
                      value={createSeverity}
                      onChange={(e) => setCreateSeverity(e.target.value as IncidentSeverity)}
                      className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[12px] text-[#F4F3EF]"
                    >
                      {(["low", "medium", "high", "critical"] as IncidentSeverity[]).map((s) => (
                        <option key={s} value={s} className="bg-[#111214]">
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setShowCreateForm(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleCreate} disabled={!createTitle.trim() || creating}>
                      {creating ? "Creating..." : "Create Incident"}
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            {incidents.map((incident, i) => {
              const isExpanded = expandedId === incident.id;
              return (
                <motion.div
                  key={incident.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * i }}
                >
                  <GlassCard className="py-4">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : incident.id)}
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {(incident.severity === "critical" || incident.severity === "high") && (
                          <AlertTriangle className="h-4 w-4 shrink-0 text-[#E8877F]" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium text-[#F4F3EF]">
                            {incident.title}
                          </p>
                          <p className="flex items-center gap-1 text-[11px] text-[#55575F]">
                            <Clock className="h-3 w-3" />
                            Started {timeAgo(incident.startedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${SEVERITY_STYLES[incident.severity]}`}
                        >
                          {incident.severity}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${STATUS_STYLES[incident.status]}`}
                        >
                          {incident.status}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-[#55575F]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[#55575F]" />
                        )}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 space-y-4 border-t border-white/[0.06] pt-4">
                            {incident.description && (
                              <p className="text-[13px] text-[#94969E]">{incident.description}</p>
                            )}

                            {/* Quick controls */}
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11.5px] text-[#55575F]">Status:</span>
                                <select
                                  value={incident.status}
                                  onChange={(e) =>
                                    handleStatusChange(incident, e.target.value as IncidentStatus)
                                  }
                                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11.5px] text-[#F4F3EF]"
                                >
                                  {(["investigating", "identified", "resolved"] as IncidentStatus[]).map(
                                    (s) => (
                                      <option key={s} value={s} className="bg-[#111214]">
                                        {s}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11.5px] text-[#55575F]">Severity:</span>
                                <select
                                  value={incident.severity}
                                  onChange={(e) =>
                                    handleSeverityChange(incident, e.target.value as IncidentSeverity)
                                  }
                                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11.5px] text-[#F4F3EF]"
                                >
                                  {(["low", "medium", "high", "critical"] as IncidentSeverity[]).map(
                                    (s) => (
                                      <option key={s} value={s} className="bg-[#111214]">
                                        {s}
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>
                            </div>

                            {/* Related commits/events */}
                            {(incident.relatedCommits.length > 0 || incident.relatedEvents.length > 0) && (
                              <div className="flex flex-wrap gap-2">
                                {incident.relatedCommits.map((c, idx) => (
                                  <span
                                    key={`c-${idx}`}
                                    className="flex items-center gap-1 rounded-full bg-white/[0.04] px-2 py-1 text-[11px] text-[#94969E]"
                                  >
                                    <GitCommit className="h-3 w-3" />
                                    {c}
                                  </span>
                                ))}
                                {incident.relatedEvents.map((ev, idx) => (
                                  <span
                                    key={`e-${idx}`}
                                    className="flex items-center gap-1 rounded-full bg-white/[0.04] px-2 py-1 text-[11px] text-[#94969E]"
                                  >
                                    <Radio className="h-3 w-3" />
                                    {ev}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Timeline */}
                            {incident.timeline.length > 0 && (
                              <div className="space-y-1.5">
                                <p className="text-[11px] font-medium uppercase tracking-wide text-[#55575F]">
                                  Timeline
                                </p>
                                {incident.timeline.map((t, idx) => (
                                  <div key={idx} className="flex gap-2 text-[12px]">
                                    <span className="shrink-0 text-[#55575F]">
                                      {new Date(t.timestamp).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                    <span className="text-[#94969E]">{t.description}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* AI analysis result */}
                            {incident.aiAnalysis ? (
                              <GlassCard highlight className="space-y-3 py-4">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="h-4 w-4 text-[#8B7FE8]" />
                                  <p className="text-[13px] font-medium text-[#F4F3EF]">
                                    AI Analysis
                                  </p>
                                  <span className="ml-auto text-[11px] text-[#94969E]">
                                    {incident.aiAnalysis.confidence}% confidence
                                  </span>
                                </div>

                                <p className="text-[13px] text-[#DADBE1]">
                                  <span className="text-[#94969E]">Root cause: </span>
                                  {incident.aiAnalysis.rootCause}
                                </p>

                                {incident.aiAnalysis.evidence.length > 0 && (
                                  <div>
                                    <p className="mb-1 text-[11px] text-[#55575F]">Evidence</p>
                                    <ul className="space-y-0.5">
                                      {incident.aiAnalysis.evidence.map((e, idx) => (
                                        <li key={idx} className="text-[12px] text-[#94969E]">
                                          • {e}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {incident.aiAnalysis.affectedComponents.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {incident.aiAnalysis.affectedComponents.map((c, idx) => (
                                      <span
                                        key={idx}
                                        className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-[#94969E]"
                                      >
                                        {c}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {incident.aiAnalysis.recommendedActions.length > 0 && (
                                  <div>
                                    <p className="mb-1 text-[11px] text-[#55575F]">
                                      Recommended actions
                                    </p>
                                    <ul className="space-y-1">
                                      {incident.aiAnalysis.recommendedActions.map((a, idx) => (
                                        <li
                                          key={idx}
                                          className="flex items-start gap-1.5 text-[12.5px] text-[#DADBE1]"
                                        >
                                          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[#22A67D]" />
                                          {a}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setShowAnalyzeForm(incident.id)}
                                >
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Re-analyze
                                </Button>
                              </GlassCard>
                            ) : (
                              <Button size="sm" onClick={() => setShowAnalyzeForm(incident.id)}>
                                <Sparkles className="h-3.5 w-3.5" />
                                Analyze with AI
                              </Button>
                            )}

                            {/* Analyze form */}
                            <AnimatePresence>
                              {showAnalyzeForm === incident.id && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                                    <div className="flex items-center justify-between">
                                      <p className="text-[12px] font-medium text-[#F4F3EF]">
                                        Provide context for the AI
                                      </p>
                                      <button onClick={() => setShowAnalyzeForm(null)}>
                                        <X className="h-3.5 w-3.5 text-[#55575F]" />
                                      </button>
                                    </div>
                                    <textarea
                                      value={errorDescription}
                                      onChange={(e) => setErrorDescription(e.target.value)}
                                      rows={2}
                                      placeholder="Error description / stack trace"
                                      className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[12.5px] text-[#F4F3EF] placeholder:text-[#55575F] focus:outline-none"
                                    />
                                    <input
                                      value={recentCommits}
                                      onChange={(e) => setRecentCommits(e.target.value)}
                                      placeholder="Recent commits (comma-separated)"
                                      className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[12.5px] text-[#F4F3EF] placeholder:text-[#55575F] focus:outline-none"
                                    />
                                    <input
                                      value={deploymentsOrEvents}
                                      onChange={(e) => setDeploymentsOrEvents(e.target.value)}
                                      placeholder="Deployments / events (comma-separated)"
                                      className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[12.5px] text-[#F4F3EF] placeholder:text-[#55575F] focus:outline-none"
                                    />
                                    <input
                                      value={affectedServicesOrFiles}
                                      onChange={(e) => setAffectedServicesOrFiles(e.target.value)}
                                      placeholder="Affected services / files (comma-separated)"
                                      className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[12.5px] text-[#F4F3EF] placeholder:text-[#55575F] focus:outline-none"
                                    />
                                    <div className="flex justify-end">
                                      <Button
                                        size="sm"
                                        onClick={() => handleAnalyze(incident)}
                                        disabled={analyzing}
                                      >
                                        {analyzing ? (
                                          <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Analyzing...
                                          </>
                                        ) : (
                                          <>
                                            <Sparkles className="h-3.5 w-3.5" />
                                            Run analysis
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                </motion.div>
              );
            })}

            {!loading && incidents.length === 0 && (
              <GlassCard className="py-10 text-center">
                <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-[#94969E]" />
                <p className="text-[14px] text-[#F4F3EF]">No incidents yet</p>
                <p className="mt-1 text-[12.5px] text-[#94969E]">
                  Nice — or nobody's logged one. Click "New Incident" to create one.
                </p>
              </GlassCard>
            )}
          </div>
        </PageSection>
      </div>
    </AppShell>
  );
}