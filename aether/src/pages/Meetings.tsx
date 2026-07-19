import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, Upload, CheckCircle2, XCircle, ListTodo, Mail, Ticket, Loader2 } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  loadMeetings,
  uploadMeeting,
  generateJiraTickets,
  generateEmailSummary,
  clearMeetingsError,
} from "../store/slices/meetingsSlice";

export default function Meetings() {
  const dispatch = useAppDispatch();
  const { meetings, isUploading, isLoading, ticketsLoadingId, emailLoadingId, error } = useAppSelector(
    (s) => s.meetings
  );
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch(loadMeetings());
  }, [dispatch]);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    dispatch(uploadMeeting(file));
  };

  return (
    <AppShell title="Meeting agent">
      <div className="mx-auto max-w-4xl space-y-8">
        <PageSection
          label="Meeting intelligence"
          title="Turn recordings into action"
          description="Upload meeting audio. AI generates minutes, action items, Jira tickets, and email summaries."
        />

        {error && (
          <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
            <span>{error}</span>
            <button onClick={() => dispatch(clearMeetingsError())} className="text-red-300/70 hover:text-red-200">
              Dismiss
            </button>
          </div>
        )}

        <GlassCard
          highlight
          className="flex flex-col items-center justify-center border-dashed py-12 text-center"
        >
          <input
            ref={fileRef}
            type="file"
            accept="audio/*,video/*"
            className="hidden"
            onChange={handleFileSelected}
          />
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#8B7FE8]/30 bg-[#8B7FE8]/10">
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-[#8B7FE8]" />
            ) : (
              <Upload className="h-6 w-6 text-[#8B7FE8]" />
            )}
          </div>
          <h3 className="mb-1 text-[15px] font-medium text-[#F4F3EF]">
            {isUploading ? "Transcribing & summarizing..." : "Upload meeting recording"}
          </h3>
          <p className="mb-4 text-[13px] text-[#94969E]">
            MP3, M4A, WAV, or video files up to 500MB
          </p>
          <div className="flex gap-3">
            <Button variant="primary" onClick={() => fileRef.current?.click()} disabled={isUploading}>
              <Upload className="h-4 w-4" />
              Choose file
            </Button>
            <Button disabled={isUploading}>
              <Mic className="h-4 w-4" />
              Record live
            </Button>
          </div>
        </GlassCard>

        <PageSection label="Recent meetings" delay={0.1}>
          <div className="space-y-4">
            {isLoading && meetings.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-[#94969E]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading meetings...
              </div>
            )}

            {!isLoading && meetings.length === 0 && (
              <p className="py-8 text-center text-[13px] text-[#55575F]">
                No meetings yet. Upload a recording to get started.
              </p>
            )}

            {meetings.map((meeting, i) => (
              <motion.div
                key={meeting.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
              >
                <GlassCard>
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-[15px] font-medium text-[#F4F3EF]">{meeting.title}</h3>
                      <p className="text-[12px] text-[#55575F]">
                        {meeting.date} · {meeting.duration}
                      </p>
                    </div>
                    <StatusBadge status={meeting.status} />
                  </div>

                  {meeting.status === "processing" && (
                    <p className="mb-4 flex items-center gap-2 text-[13px] text-[#94969E]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Transcribing audio and generating minutes...
                    </p>
                  )}

                  {meeting.summary && (
                    <p className="mb-4 text-[13px] leading-relaxed text-[#94969E]">
                      {meeting.summary}
                    </p>
                  )}

                  {meeting.actionItems.length > 0 && (
                    <div className="mb-4">
                      <div className="mb-2 flex items-center gap-1.5">
                        <ListTodo className="h-3.5 w-3.5 text-[#22A67D]" />
                        <span className="text-[12px] font-medium text-[#F4F3EF]">Action items</span>
                      </div>
                      <ul className="space-y-1.5">
                        {meeting.actionItems.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-[13px] text-[#94969E]"
                          >
                            <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#22A67D]" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {meeting.ticketsCreated && meeting.tickets.length > 0 && (
                    <div className="mb-4">
                      <div className="mb-2 flex items-center gap-1.5">
                        <Ticket className="h-3.5 w-3.5 text-[#8B7FE8]" />
                        <span className="text-[12px] font-medium text-[#F4F3EF]">
                          Tickets ({meeting.tickets.length})
                        </span>
                      </div>
                      <ul className="space-y-1.5">
                        {meeting.tickets.map((t) => (
                          <li key={t.id} className="text-[13px] text-[#94969E]">
                            {t.key ? (
                              <a href={t.url} target="_blank" rel="noreferrer" className="text-[#8B7FE8] hover:underline">
                                {t.key}
                              </a>
                            ) : (
                              <span className="text-[#55575F]">[unfiled]</span>
                            )}{" "}
                            {t.summary} · <span className="text-[11px]">{t.priority}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {meeting.emailSent && (
                    <p className="mb-4 text-[12px] text-[#22A67D]">Recap email sent.</p>
                  )}

                  {meeting.status === "ready" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => dispatch(generateJiraTickets(meeting.id))}
                        disabled={ticketsLoadingId === meeting.id || meeting.actionItems.length === 0}
                      >
                        {ticketsLoadingId === meeting.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Ticket className="h-3.5 w-3.5" />
                        )}
                        {meeting.ticketsCreated ? "Regenerate tickets" : "Create Jira tickets"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => dispatch(generateEmailSummary(meeting.id))}
                        disabled={emailLoadingId === meeting.id}
                      >
                        {emailLoadingId === meeting.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Mail className="h-3.5 w-3.5" />
                        )}
                        Email summary
                      </Button>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </PageSection>
      </div>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: "processing" | "ready" | "failed" }) {
  if (status === "ready") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-[#22A67D]/15 px-2 py-0.5 text-[11px] text-[#22A67D]">
        <CheckCircle2 className="h-3 w-3" />
        Ready
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] text-red-400">
        <XCircle className="h-3 w-3" />
        Failed
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-[#8B7FE8]/15 px-2 py-0.5 text-[11px] text-[#8B7FE8]">
      <Loader2 className="h-3 w-3 animate-spin" />
      Processing
    </span>
  );
}