import { useRef } from "react";
import { motion } from "framer-motion";
import { Mic, Upload, CheckCircle2, ListTodo, Mail, Ticket, Loader2 } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setUploading, addMeeting } from "../store/slices/meetingsSlice";
import { addTask } from "../store/slices/tasksSlice";

export default function Meetings() {
  const dispatch = useAppDispatch();
  const { meetings, isUploading } = useAppSelector((s) => s.meetings);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = () => {
    dispatch(setUploading(true));
    setTimeout(() => {
      dispatch(
        addMeeting({
          id: `mt-${Date.now()}`,
          title: "Standup — Jul 13",
          date: "Jul 13, 2026",
          duration: "18 min",
          status: "ready",
          summary: "Team discussed login bug fix and payment service optimization.",
          actionItems: [
            "Fix login bug (in progress)",
            "Optimize Redis cache layer",
            "Review PR #38 by EOD",
          ],
        })
      );
      dispatch(
        addTask({
          id: `t-${Date.now()}`,
          title: "Review PR #38 by EOD",
          status: "open",
          source: "ai",
          priority: "medium",
        })
      );
      dispatch(setUploading(false));
    }, 2500);
  };

  return (
    <AppShell title="Meeting agent">
      <div className="mx-auto max-w-4xl space-y-8">
        <PageSection
          label="Meeting intelligence"
          title="Turn recordings into action"
          description="Upload meeting audio. AI generates minutes, action items, Jira tickets, and email summaries."
        />

        <GlassCard
          highlight
          className="flex flex-col items-center justify-center border-dashed py-12 text-center"
        >
          <input
            ref={fileRef}
            type="file"
            accept="audio/*,video/*"
            className="hidden"
            onChange={handleUpload}
          />
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#8B7FE8]/30 bg-[#8B7FE8]/10">
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-[#8B7FE8]" />
            ) : (
              <Upload className="h-6 w-6 text-[#8B7FE8]" />
            )}
          </div>
          <h3 className="mb-1 text-[15px] font-medium text-[#F4F3EF]">
            {isUploading ? "Processing recording..." : "Upload meeting recording"}
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
                    <span className="flex items-center gap-1 rounded-full bg-[#22A67D]/15 px-2 py-0.5 text-[11px] text-[#22A67D]">
                      <CheckCircle2 className="h-3 w-3" />
                      Ready
                    </span>
                  </div>

                  {meeting.summary && (
                    <p className="mb-4 text-[13px] leading-relaxed text-[#94969E]">
                      {meeting.summary}
                    </p>
                  )}

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

                  <div className="flex gap-2">
                    <Button size="sm">
                      <Ticket className="h-3.5 w-3.5" />
                      Create Jira tickets
                    </Button>
                    <Button size="sm">
                      <Mail className="h-3.5 w-3.5" />
                      Email summary
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </PageSection>
      </div>
    </AppShell>
  );
}
