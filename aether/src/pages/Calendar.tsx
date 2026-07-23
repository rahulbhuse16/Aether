import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Video,
  Link2,
  Unlink,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  List,
  Grid3x3,
} from "lucide-react";
import { FaGoogle } from "react-icons/fa";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  fetchCalendarStatus,
  fetchCalendarEvents,
  disconnectCalendar,
} from "../store/slices/calndarSlice";
import { calendarService } from "../services/calendar";
import type { CalendarEvent } from "../services/calendar";
import { CreateMeetingModal } from "../components/ui/CreateMeetingModal";

type ViewMode = "agenda" | "month";

const STATUS_STYLES: Record<CalendarEvent["status"], string> = {
  confirmed: "bg-[#22A67D]/15 text-[#22A67D]",
  tentative: "bg-[#8B7FE8]/15 text-[#8B7FE8]",
  cancelled: "bg-white/[0.06] text-[#55575F] line-through",
};

const STATUS_DOT: Record<CalendarEvent["status"], string> = {
  confirmed: "bg-[#22A67D]",
  tentative: "bg-[#8B7FE8]",
  cancelled: "bg-[#55575F]",
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDay = new Date(date);
  eventDay.setHours(0, 0, 0, 0);

  const diffDays = Math.round((eventDay.getTime() - today.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return eventDay.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatTimeRange(event: CalendarEvent): string {
  if (event.allDay) return "All day";
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const start = new Date(event.start).toLocaleTimeString([], opts);
  const end = new Date(event.end).toLocaleTimeString([], opts);
  return `${start} – ${end}`;
}

function groupByDay(
  events: CalendarEvent[]
): { label: string; date: string; events: CalendarEvent[] }[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  const groups: { label: string; date: string; events: CalendarEvent[] }[] = [];

  for (const event of sorted) {
    const dateKey = new Date(event.start).toDateString();
    const existing = groups.find((g) => g.date === dateKey);
    if (existing) {
      existing.events.push(event);
    } else {
      groups.push({ label: dayLabel(event.start), date: dateKey, events: [event] });
    }
  }

  return groups;
}

/**
 * Builds a 6x7 (42-cell) grid for the given month, including the trailing
 * days of the previous month and leading days of the next month needed to
 * fill complete weeks — the same layout Google Calendar's month view uses.
 */
function getMonthGrid(monthDate: Date): Date[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function EventCard({ event, delay }: { event: CalendarEvent; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <GlassCard className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <p className="truncate text-[14px] font-medium text-[#F4F3EF]">{event.title}</p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${STATUS_STYLES[event.status]}`}
              >
                {event.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[#94969E]">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatTimeRange(event)}
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.location}
                </span>
              )}
              {event.attendees.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {event.attendees.length === 1 ? event.attendees[0] : `${event.attendees.length} attendees`}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            {event.meetingUrl && (
              <a href={event.meetingUrl} target="_blank" rel="noreferrer">
                <Button size="sm">
                  <Video className="h-3.5 w-3.5" />
                  Join
                </Button>
              </a>
            )}
            <a href={event.htmlLink} target="_blank" rel="noreferrer">
              <Button size="sm" variant="ghost">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default function Calendar() {
  const dispatch = useAppDispatch();
  const userId = localStorage.getItem("userId") as string;
  const { connected, email, events, status } = useAppSelector((s) => s.calendar);
  const[isOpen,setIsOpen]=useState(false)

  const openModal=()=>{
    setIsOpen(true)
  }


  const [viewMode, setViewMode] = useState<ViewMode>("agenda");
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  useEffect(() => {
    if (userId) dispatch(fetchCalendarStatus(userId));
  }, [dispatch, userId]);

  // Refetch real events for whatever range is currently in view — the
  // initial 7-day agenda range, or the full visible month grid.
  useEffect(() => {
    if (!userId || !connected) return;

    if (viewMode === "agenda") {
      const now = new Date();
      const in7Days = new Date(now);
      in7Days.setDate(now.getDate() + 7);
      dispatch(
        fetchCalendarEvents({
          userId,
          timeMin: now.toISOString(),
          timeMax: in7Days.toISOString(),
        })
      );
    } else {
      const grid = getMonthGrid(visibleMonth);
      dispatch(
        fetchCalendarEvents({
          userId,
          timeMin: grid[0].toISOString(),
          timeMax: grid[grid.length - 1].toISOString(),
        })
      );
    }
  }, [dispatch, userId, connected, viewMode, visibleMonth]);

  const handleConnect = () => calendarService.connect(userId);
  const handleDisconnect = () => dispatch(disconnectCalendar(userId));

  const goToToday = () => {
    const d = new Date();
    d.setDate(1);
    setVisibleMonth(d);
    setSelectedDate(new Date());
  };

  const goPrevMonth = () => {
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const groups = groupByDay(events);
  const monthGrid = getMonthGrid(visibleMonth);
  const today = new Date();

  const eventsOnDate = (d: Date) =>
    events.filter((e) => isSameDay(new Date(e.start), d));

  const selectedDayEvents = eventsOnDate(selectedDate).sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  return (
    <AppShell title="Calendar">
      <div className="mx-auto max-w-3xl space-y-8">
        <PageSection label="Google Calendar" title="Connection">
          <GlassCard>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#8B7FE8] to-[#22A67D] text-[#0A0B0D]">
                <FaGoogle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-medium text-[#F4F3EF]">
                  {connected ? email ?? "Google Calendar" : "Not connected"}
                </p>
                <p className="text-[13px] text-[#94969E]">
                  {connected
                    ? "Events sync automatically from your Google account"
                    : "Connect your calendar to see upcoming events here"}
                </p>
                {status === "failed" && (
                  <p className="mt-1 text-[12px] text-[#E8877F]">
                    Couldn't refresh calendar data. Showing the last known events.
                  </p>
                )}
              </div>
              {connected ? (
                <Button size="sm" variant="ghost" onClick={handleDisconnect}>
                  <Unlink className="h-3.5 w-3.5" />
                  Disconnect
                </Button>
              ) : (
                <Button size="sm" onClick={handleConnect}>
                  <Link2 className="h-3.5 w-3.5" />
                  Connect Calendar
                </Button>
              )}
            </div>
          </GlassCard>
        </PageSection>

         

        {connected && (
          <PageSection label="Schedule" title="Your events" delay={0.05}>
            {/* View toggle */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex gap-1 rounded-full bg-white/[0.03] p-1">
                <button
                  onClick={() => setViewMode("agenda")}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] transition-colors ${
                    viewMode === "agenda"
                      ? "bg-white/[0.08] text-[#F4F3EF]"
                      : "text-[#94969E] hover:text-[#F4F3EF]"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  Agenda
                </button>
                <button
                  onClick={() => setViewMode("month")}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] transition-colors ${
                    viewMode === "month"
                      ? "bg-white/[0.08] text-[#F4F3EF]"
                      : "text-[#94969E] hover:text-[#F4F3EF]"
                  }`}
                >
                  <Grid3x3 className="h-3.5 w-3.5" />
                  Month
                </button>
                
              </div>
              <Button onClick={openModal}  size="sm">
                  <Video className="h-3.5 w-3.5" />
                  Create Meeting
                </Button>

              {viewMode === "month" && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={goPrevMonth}
                    className="rounded-full p-1.5 text-[#94969E] hover:bg-white/[0.04] hover:text-[#F4F3EF]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <p className="min-w-[130px] text-center text-[13px] font-medium text-[#F4F3EF]">
                    {visibleMonth.toLocaleDateString(undefined, {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <button
                    onClick={goNextMonth}
                    className="rounded-full p-1.5 text-[#94969E] hover:bg-white/[0.04] hover:text-[#F4F3EF]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <Button size="sm" variant="ghost" className="ml-1" onClick={goToToday}>
                    Today
                  </Button>
                </div>
              )}
            </div>

            {viewMode === "agenda" ? (
              <div className="space-y-6">
                {groups.map((group, gi) => (
                  <div key={group.date}>
                    <div className="mb-2 flex items-center gap-2 px-1">
                      <CalendarDays className="h-3.5 w-3.5 text-[#55575F]" />
                      <p className="text-[12px] font-medium uppercase tracking-wide text-[#55575F]">
                        {group.label}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {group.events.map((event, i) => (
                        <EventCard key={event.id} event={event} delay={0.03 * (gi + i)} />
                      ))}
                    </div>
                  </div>
                ))}

                {groups.length === 0 && (
                  <GlassCard className="py-10 text-center">
                    <CalendarDays className="mx-auto mb-3 h-6 w-6 text-[#94969E]" />
                    <p className="text-[14px] text-[#F4F3EF]">Nothing on your calendar</p>
                    <p className="mt-1 text-[12.5px] text-[#94969E]">
                      Events from your connected Google Calendar will show up here.
                    </p>
                  </GlassCard>
                )}
              </div>
            ) : (
              <>
                {/* Month grid */}
                <GlassCard className="p-3">
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAY_LABELS.map((wd) => (
                      <div
                        key={wd}
                        className="py-2 text-center text-[11px] font-medium uppercase tracking-wide text-[#55575F]"
                      >
                        {wd}
                      </div>
                    ))}

                    {monthGrid.map((date) => {
                      const inCurrentMonth = date.getMonth() === visibleMonth.getMonth();
                      const isToday = isSameDay(date, today);
                      const isSelected = isSameDay(date, selectedDate);
                      const dayEvents = eventsOnDate(date);

                      return (
                        <button
                          key={date.toISOString()}
                          onClick={() => setSelectedDate(date)}
                          className={`flex min-h-[76px] flex-col items-start rounded-lg border p-1.5 text-left transition-colors ${
                            isSelected
                              ? "border-[#8B7FE8]/40 bg-[#8B7FE8]/[0.08]"
                              : "border-transparent hover:bg-white/[0.03]"
                          }`}
                        >
                          <span
                            className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[12px] ${
                              isToday
                                ? "bg-gradient-to-br from-[#8B7FE8] to-[#22A67D] font-medium text-[#0A0B0D]"
                                : inCurrentMonth
                                ? "text-[#F4F3EF]"
                                : "text-[#55575F]"
                            }`}
                          >
                            {date.getDate()}
                          </span>

                          <div className="w-full space-y-0.5">
                            {dayEvents.slice(0, 2).map((e) => (
                              <div
                                key={e.id}
                                className="flex items-center gap-1 truncate text-[10.5px] text-[#94969E]"
                              >
                                <span
                                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[e.status]}`}
                                />
                                <span className="truncate">{e.title}</span>
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <p className="text-[10px] text-[#55575F]">
                                +{dayEvents.length - 2} more
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </GlassCard>

                {/* Selected day detail */}
                <div className="mt-4 space-y-2">
                  <p className="px-1 text-[12px] font-medium uppercase tracking-wide text-[#55575F]">
                    {selectedDate.toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>

                  {selectedDayEvents.length === 0 ? (
                    <GlassCard className="py-6 text-center text-[13px] text-[#94969E]">
                      No events on this day.
                    </GlassCard>
                  ) : (
                    selectedDayEvents.map((event, i) => (
                      <EventCard key={event.id} event={event} delay={0.03 * i} />
                    ))
                  )}
                </div>
              </>
            )}
          </PageSection>
        )}
      </div>
      <CreateMeetingModal onCreateMeeting={()=>{

      }} isOpen={isOpen} onClose={() => setIsOpen(false)}/>
    </AppShell>
  );
}