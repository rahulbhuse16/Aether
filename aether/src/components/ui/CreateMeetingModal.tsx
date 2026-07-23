import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Clock,
  Video,
  Users,
  Sparkles,
  AlignLeft,
  Plus,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { Button } from "./Button";
import { useState } from "react";
import type { IPayload } from "../../services/calendar";

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;

  onCreateMeeting: (meeting: IPayload) => void;
}

const TIMEZONES = [
  "Asia/Kolkata",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Singapore",
  "Asia/Tokyo",
] as const;

export function CreateMeetingModal({
  isOpen,
  onClose,
  onCreateMeeting,
}: CreateMeetingModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [timezone, setTimezone] =
    useState<string>("Asia/Kolkata");

  const [attendees, setAttendees] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setTimezone("Asia/Kolkata");
    setAttendees([]);
    setEmailInput("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAddAttendee = () => {
    const email = emailInput.trim();
    if (email && !attendees.includes(email) && email.includes('@')) {
      setAttendees([...attendees, email]);
      setEmailInput("");
    }
  };

  const handleRemoveAttendee = (email: string) => {
    setAttendees(attendees.filter((e) => e !== email));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !title.trim() ||
      !date ||
      !startTime ||
      !endTime
    ) {
      return;
    }

    const startDateTime = new Date(
      `${date}T${startTime}`
    ).toISOString();

    const endDateTime = new Date(
      `${date}T${endTime}`
    ).toISOString();

    onCreateMeeting({
      title: title.trim(),
      description: description.trim() || undefined,
      startTime: startDateTime,
      endTime: endDateTime,
      timezone,
      attendees: attendees,
      userId : localStorage.getItem("userId") as string
    });

    resetForm();
    onClose();
  };

  const isFormValid =
    title.trim() &&
    date &&
    startTime &&
    endTime;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.95,
                y: 10,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                y: 10,
              }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-xl my-4"
            >
              <GlassCard className="overflow-hidden p-6 max-h-[calc(100vh-2rem)] overflow-y-auto">
                {/* Header */}
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#8B7FE8]/20 bg-[#8B7FE8]/10 text-[#8B7FE8]">
                      <Video className="h-5 w-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-[16px] font-medium text-[#F4F3EF]">
                          Create meeting
                        </h2>

                        <Sparkles className="h-3.5 w-3.5 text-[#8B7FE8]" />
                      </div>

                      <p className="mt-1 text-[12px] text-[#55575F]">
                        Schedule a Google Meet with your team
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleClose}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.02] text-[#94969E] transition-colors hover:bg-white/[0.04] hover:text-[#F4F3EF]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Form */}
                <form
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  {/* Meeting Title */}
                  <div>
                    <label className="mb-2 block text-[12px] font-medium text-[#94969E]">
                      Meeting title *
                    </label>

                    <input
                      type="text"
                      value={title}
                      onChange={(e) =>
                        setTitle(e.target.value)
                      }
                      placeholder="e.g. Aether sprint planning"
                      className="w-full rounded-lg border border-white/[0.1] bg-white/[0.02] px-4 py-2.5 text-[13px] text-[#F4F3EF] placeholder:text-[#55575F] focus:border-[#8B7FE8]/50 focus:outline-none focus:ring-1 focus:ring-[#8B7FE8]/50"
                      autoFocus
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="mb-2 block text-[12px] font-medium text-[#94969E]">
                      Description
                    </label>

                    <div className="relative">
                      <AlignLeft className="absolute left-3 top-3 h-4 w-4 text-[#55575F]" />

                      <textarea
                        value={description}
                        onChange={(e) =>
                          setDescription(e.target.value)
                        }
                        placeholder="What should this meeting cover?"
                        rows={3}
                        className="w-full resize-none rounded-lg border border-white/[0.1] bg-white/[0.02] px-4 py-2.5 pl-10 text-[13px] text-[#F4F3EF] placeholder:text-[#55575F] focus:border-[#8B7FE8]/50 focus:outline-none focus:ring-1 focus:ring-[#8B7FE8]/50"
                      />
                    </div>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="mb-2 block text-[12px] font-medium text-[#94969E]">
                      Date *
                    </label>

                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#55575F]" />

                      <input
                        type="date"
                        value={date}
                        onChange={(e) =>
                          setDate(e.target.value)
                        }
                        className="w-full rounded-lg border border-white/[0.1] bg-white/[0.02] px-4 py-2.5 pl-10 text-[13px] text-[#F4F3EF] focus:border-[#8B7FE8]/50 focus:outline-none focus:ring-1 focus:ring-[#8B7FE8]/50 [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  {/* Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-2 block text-[12px] font-medium text-[#94969E]">
                        Start time *
                      </label>

                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#55575F]" />

                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) =>
                            setStartTime(e.target.value)
                          }
                          className="w-full rounded-lg border border-white/[0.1] bg-white/[0.02] px-4 py-2.5 pl-10 text-[13px] text-[#F4F3EF] focus:border-[#8B7FE8]/50 focus:outline-none focus:ring-1 focus:ring-[#8B7FE8]/50 [color-scheme:dark]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-[12px] font-medium text-[#94969E]">
                        End time *
                      </label>

                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#55575F]" />

                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) =>
                            setEndTime(e.target.value)
                          }
                          className="w-full rounded-lg border border-white/[0.1] bg-white/[0.02] px-4 py-2.5 pl-10 text-[13px] text-[#F4F3EF] focus:border-[#8B7FE8]/50 focus:outline-none focus:ring-1 focus:ring-[#8B7FE8]/50 [color-scheme:dark]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="mb-2 block text-[12px] font-medium text-[#94969E]">
                      Timezone
                    </label>

                    <select
                      value={timezone}
                      onChange={(e) =>
                        setTimezone(e.target.value)
                      }
                      className="w-full rounded-lg border border-white/[0.1] bg-white/[0.02] px-4 py-2.5 text-[13px] text-[#F4F3EF] focus:border-[#8B7FE8]/50 focus:outline-none focus:ring-1 focus:ring-[#8B7FE8]/50"
                    >
                      {TIMEZONES.map((zone) => (
                        <option
                          key={zone}
                          value={zone}
                          className="bg-[#15151A]"
                        >
                          {zone}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Attendees */}
                  <div>
                    <label className="mb-2 block text-[12px] font-medium text-[#94969E]">
                      Invite attendees
                    </label>

                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#55575F]" />

                      <input
                        type="text"
                        value={emailInput}
                        onChange={(e) =>
                          setEmailInput(e.target.value)
                        }
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddAttendee();
                          }
                        }}
                        placeholder="email@example.com"
                        className="w-full rounded-lg border border-white/[0.1] bg-white/[0.02] px-4 py-2.5 pl-10 pr-10 text-[13px] text-[#F4F3EF] placeholder:text-[#55575F] focus:border-[#8B7FE8]/50 focus:outline-none focus:ring-1 focus:ring-[#8B7FE8]/50"
                      />

                      <button
                        type="button"
                        onClick={handleAddAttendee}
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-[#8B7FE8] text-white hover:bg-[#7B6FD8] transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Attendee badges */}
                    {attendees.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {attendees.map((email) => (
                          <div
                            key={email}
                            className="flex items-center gap-1.5 rounded-full border border-[#8B7FE8]/30 bg-[#8B7FE8]/10 px-3 py-1 text-[12px] text-[#F4F3EF]"
                          >
                            <span className="truncate max-w-[150px]">{email}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttendee(email)}
                              className="flex h-4 w-4 items-center justify-center rounded-full text-[#94969E] hover:text-[#F4F3EF] hover:bg-white/[0.1] transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="mt-1.5 text-[11px] text-[#55575F]">
                      Press Enter or click + to add email addresses
                    </p>
                  </div>

                  {/* Meeting Preview */}
                  <div className="rounded-xl border border-[#8B7FE8]/15 bg-[#8B7FE8]/[0.05] p-4">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-[#8B7FE8]" />

                      <span className="text-[12px] font-medium text-[#F4F3EF]">
                        Google Meet link included
                      </span>
                    </div>

                    <p className="mt-1.5 text-[11px] leading-relaxed text-[#94969E]">
                      A Google Calendar event will be created and a
                      Google Meet video link will be generated automatically.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex-1"
                      onClick={handleClose}
                    >
                      Cancel
                    </Button>

                    <Button
                      type="submit"
                      variant="primary"
                      className="flex-1"
                      disabled={!isFormValid}
                    >
                      <Video className="mr-2 h-4 w-4" />
                      Create meeting
                    </Button>
                  </div>
                </form>
              </GlassCard>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}