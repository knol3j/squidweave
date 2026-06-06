import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  CalendarDays,
  Clock,
  Users,
  FileText,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Video,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type MeetingType = "discovery" | "demo" | "followup" | "pitch";
type MeetingStatus = "scheduled" | "completed" | "cancelled" | "noshow";

interface Meeting {
  id: string;
  prospectName: string;
  prospectEmail: string;
  type: MeetingType;
  date: string; // ISO date string
  time: string; // "HH:MM" 24h
  duration: number; // minutes
  notes: string;
  status: MeetingStatus;
  location: string;
  createdAt: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "sw_meetings";

const MEETING_TYPES: { type: MeetingType; label: string; icon: LucideIcon; color: string }[] = [
  { type: "discovery", label: "Discovery", icon: Users, color: "#6366f1" },
  { type: "demo", label: "Demo", icon: Video, color: "#06b6d4" },
  { type: "followup", label: "Follow-up", icon: Phone, color: "#f59e0b" },
  { type: "pitch", label: "Pitch", icon: FileText, color: "#10b981" },
];

const TYPE_MAP = Object.fromEntries(MEETING_TYPES.map(m => [m.type, m])) as Record<MeetingType, typeof MEETING_TYPES[0]>;

const DURATION_OPTIONS = [15, 30, 45, 60];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── localStorage helpers ─────────────────────────────────────────────────────

function loadMeetings(): Meeting[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) as Meeting[]; } catch { /* silent */ }
  return makeDemoMeetings();
}

function saveMeetings(m: Meeting[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)); }

// ─── Demo data ────────────────────────────────────────────────────────────────

function makeDemoMeetings(): Meeting[] {
  const now = new Date();
  const d = (offset: number) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + offset);
    return dt.toISOString().split("T")[0];
  };
  const ts = Date.now();
  return [
    {
      id: `mtg-${ts}-1`,
      prospectName: "Sarah Chen",
      prospectEmail: "sarah@acme.com",
      type: "discovery",
      date: d(1),
      time: "10:00",
      duration: 30,
      notes: "Initial discovery call. Research their current tooling stack.",
      status: "scheduled",
      location: "Zoom",
      createdAt: new Date(now.getTime() - 86400000).toISOString(),
    },
    {
      id: `mtg-${ts}-2`,
      prospectName: "Marcus Johnson",
      prospectEmail: "marcus@techflow.io",
      type: "demo",
      date: d(2),
      time: "14:30",
      duration: 45,
      notes: "Full product demo for the engineering team. Prepare sandbox.",
      status: "scheduled",
      location: "Google Meet",
      createdAt: new Date(now.getTime() - 172800000).toISOString(),
    },
    {
      id: `mtg-${ts}-3`,
      prospectName: "Aisha Patel",
      prospectEmail: "aisha@growthlabs.co",
      type: "pitch",
      date: d(-1),
      time: "11:00",
      duration: 60,
      notes: "Enterprise pitch. Include pricing sheet and case studies.",
      status: "completed",
      location: "In Person",
      createdAt: new Date(now.getTime() - 259200000).toISOString(),
    },
    {
      id: `mtg-${ts}-4`,
      prospectName: "Tom Richards",
      prospectEmail: "tom@startup.xyz",
      type: "followup",
      date: d(-3),
      time: "09:00",
      duration: 15,
      notes: "Quick follow-up after the demo. Address integration questions.",
      status: "completed",
      location: "Phone",
      createdAt: new Date(now.getTime() - 432000000).toISOString(),
    },
    {
      id: `mtg-${ts}-5`,
      prospectName: "Elena Volkov",
      prospectEmail: "elena@globaltech.com",
      type: "discovery",
      date: d(3),
      time: "16:00",
      duration: 30,
      notes: "First contact via LinkedIn warm intro.",
      status: "scheduled",
      location: "Zoom",
      createdAt: new Date(now.getTime() - 43200000).toISOString(),
    },
  ];
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let h = 8; h <= 18; h++) {
    slots.push({ time: `${h.toString().padStart(2, "0")}:00`, available: Math.random() > 0.3 });
    slots.push({ time: `${h.toString().padStart(2, "0")}:30`, available: Math.random() > 0.3 });
  }
  return slots;
}

function getWeekDays(offsetWeeks: number): Date[] {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) + offsetWeeks * 7; // Monday start
  const monday = new Date(now.setDate(diff));
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getCountdown(targetDate: string, targetTime: string): string {
  const target = new Date(`${targetDate}T${targetTime}`);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return "Now";
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${mins}m`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MeetingScheduler() {
  const { state } = useApp();
  const { prospectPipeline } = state;

  // Generate prospect list from pipeline + defaults
  const prospectOptions = useMemo(() => {
    const defaults = [
      { name: "Sarah Chen", email: "sarah@acme.com" },
      { name: "Marcus Johnson", email: "marcus@techflow.io" },
      { name: "Aisha Patel", email: "aisha@growthlabs.co" },
      { name: "Tom Richards", email: "tom@startup.xyz" },
      { name: "Elena Volkov", email: "elena@globaltech.com" },
      { name: "James Liu", email: "james@nextgen.com" },
      { name: "Priya Sharma", email: "priya@innovate.io" },
    ];
    const pipelineProspects = (prospectPipeline?.prospects || []).map((p: any) => ({
      name: p.name || p.fullName || p.email,
      email: p.email || p.workEmail || "",
    })).filter((p: { email: string }) => p.email);
    const combined = [...pipelineProspects, ...defaults];
    const seen = new Set<string>();
    return combined.filter(p => { if (seen.has(p.email)) return false; seen.add(p.email); return true; });
  }, [prospectPipeline]);

  const [meetings, setMeetings] = useState<Meeting[]>(loadMeetings);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [prospectName, setProspectName] = useState("");
  const [prospectEmail, setProspectEmail] = useState("");
  const [meetingType, setMeetingType] = useState<MeetingType>("discovery");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("Zoom");
  const [activeView, setActiveView] = useState<"calendar" | "list" | "history">("calendar");

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const timeSlots = useMemo(() => generateTimeSlots(), [selectedDate]);

  useEffect(() => { saveMeetings(meetings); }, [meetings]);

  const upcomingMeetings = useMemo(() =>
    meetings
      .filter(m => m.status === "scheduled" && new Date(`${m.date}T${m.time}`) >= new Date())
      .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()),
    [meetings]
  );

  const pastMeetings = useMemo(() =>
    meetings
      .filter(m => m.status !== "scheduled" || new Date(`${m.date}T${m.time}`) < new Date())
      .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime()),
    [meetings]
  );

  const meetingsForDate = useMemo(() =>
    meetings.filter(m => m.date === selectedDate && m.status === "scheduled"),
    [meetings, selectedDate]
  );

  const bookMeeting = useCallback(() => {
    if (!prospectName.trim() || !selectedSlot) return;
    const newMeeting: Meeting = {
      id: `mtg-${Date.now()}`,
      prospectName: prospectName.trim(),
      prospectEmail: prospectEmail.trim(),
      type: meetingType,
      date: selectedDate,
      time: selectedSlot,
      duration,
      notes: notes.trim(),
      status: "scheduled",
      location: location.trim() || "Zoom",
      createdAt: new Date().toISOString(),
    };
    setMeetings(prev => [...prev, newMeeting]);
    setShowCreate(false);
    setProspectName("");
    setProspectEmail("");
    setNotes("");
    setSelectedSlot(null);
  }, [prospectName, prospectEmail, meetingType, selectedDate, selectedSlot, duration, notes, location]);

  const cancelMeeting = useCallback((id: string) => {
    setMeetings(prev => prev.map(m => m.id === id ? { ...m, status: "cancelled" as MeetingStatus } : m));
  }, []);

  const completeMeeting = useCallback((id: string) => {
    setMeetings(prev => prev.map(m => m.id === id ? { ...m, status: "completed" as MeetingStatus } : m));
  }, []);

  const deleteMeeting = useCallback((id: string) => {
    setMeetings(prev => prev.filter(m => m.id !== id));
  }, []);

  const selectProspect = useCallback((name: string, email: string) => {
    setProspectName(name);
    setProspectEmail(email);
  }, []);

  const isToday = (d: Date) => formatDate(d) === formatDate(new Date());

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-300">Meeting Scheduler</div>
        </div>
        <button
          onClick={() => setShowCreate(p => !p)}
          className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Book Meeting
        </button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Upcoming</div>
          <div className="text-lg font-bold text-sky-400 mt-1">{upcomingMeetings.length}</div>
        </div>
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">This Week</div>
          <div className="text-lg font-bold text-slate-100 mt-1">
            {upcomingMeetings.filter(m => {
              const d = new Date(m.date);
              const now = new Date();
              const weekStart = new Date(now);
              weekStart.setDate(now.getDate() - now.getDay() + 1);
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 6);
              return d >= weekStart && d <= weekEnd;
            }).length}
          </div>
        </div>
        <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Completed</div>
          <div className="text-lg font-bold text-emerald-400 mt-1">
            {meetings.filter(m => m.status === "completed").length}
          </div>
        </div>
      </div>

      {/* ── View Tabs ── */}
      <div className="flex items-center gap-1 border-b border-white/[0.06]">
        <button
          onClick={() => setActiveView("calendar")}
          className={`flex items-center gap-1 text-[10px] px-3 py-1.5 font-medium transition-colors ${activeView === "calendar" ? "text-indigo-400 border-b-2 border-indigo-400" : "text-slate-500 hover:text-slate-300"}`}
        >
          <CalendarDays className="w-3 h-3" />
          Calendar
        </button>
        <button
          onClick={() => setActiveView("list")}
          className={`flex items-center gap-1 text-[10px] px-3 py-1.5 font-medium transition-colors ${activeView === "list" ? "text-indigo-400 border-b-2 border-indigo-400" : "text-slate-500 hover:text-slate-300"}`}
        >
          <Clock className="w-3 h-3" />
          Upcoming ({upcomingMeetings.length})
        </button>
        <button
          onClick={() => setActiveView("history")}
          className={`flex items-center gap-1 text-[10px] px-3 py-1.5 font-medium transition-colors ${activeView === "history" ? "text-indigo-400 border-b-2 border-indigo-400" : "text-slate-500 hover:text-slate-300"}`}
        >
          <CheckCircle2 className="w-3 h-3" />
          History
        </button>
      </div>

      {/* ── Create Meeting Form ── */}
      {showCreate && (
        <div className="p-4 rounded-xl border border-indigo-500/15 bg-indigo-500/[0.03] space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-300">Book New Meeting</div>

          {/* Prospect Picker */}
          <div>
            <div className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-wider">Select Prospect</div>
            <div className="flex flex-wrap gap-1 mb-2">
              {prospectOptions.map(p => (
                <button
                  key={p.email}
                  onClick={() => selectProspect(p.name, p.email)}
                  className={`text-[9px] px-2 py-1 rounded-md border transition-colors ${
                    prospectName === p.name
                      ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                      : "border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={prospectName}
                onChange={e => setProspectName(e.target.value)}
                placeholder="Prospect name *"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/30"
              />
              <input
                value={prospectEmail}
                onChange={e => setProspectEmail(e.target.value)}
                placeholder="Email"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/30"
              />
            </div>
          </div>

          {/* Meeting Type */}
          <div>
            <div className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-wider">Meeting Type</div>
            <div className="flex flex-wrap gap-1.5">
              {MEETING_TYPES.map(mt => {
                const Icon = mt.icon;
                return (
                  <button
                    key={mt.type}
                    onClick={() => setMeetingType(mt.type)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                      meetingType === mt.type
                        ? "border bg-opacity-10"
                        : "border border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-slate-200"
                    }`}
                    style={meetingType === mt.type ? { borderColor: `${mt.color}40`, backgroundColor: `${mt.color}15`, color: mt.color } : {}}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    {mt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date, Time, Duration */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[10px] text-slate-500 mb-1">Date</div>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 focus:outline-none focus:border-indigo-500/30"
              />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 mb-1">Time</div>
              <select
                value={selectedSlot || ""}
                onChange={e => setSelectedSlot(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 focus:outline-none focus:border-indigo-500/30"
              >
                <option value="">Select time</option>
                {timeSlots.filter(s => s.available).map(s => (
                  <option key={s.time} value={s.time}>{s.time}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 mb-1">Duration</div>
              <select
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 focus:outline-none focus:border-indigo-500/30"
              >
                {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>

          {/* Location & Notes */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-slate-500 mb-1">Location</div>
              <div className="relative">
                <MapPin className="w-3 h-3 text-slate-600 absolute left-2 top-1.5" />
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full text-xs pl-6 pr-2 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 focus:outline-none focus:border-indigo-500/30"
                />
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 mb-1">Notes</div>
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Meeting notes..."
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-white/[0.1] bg-[#0f172a] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/30"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={bookMeeting}
              disabled={!prospectName.trim() || !selectedSlot}
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Book Meeting
            </button>
            <button
              onClick={() => { setShowCreate(false); setSelectedSlot(null); }}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/[0.1] text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Calendar View ── */}
      {activeView === "calendar" && (
        <div className="space-y-3">
          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setWeekOffset(p => p - 1)}
              className="p-1 rounded-md text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-[10px] font-medium text-slate-400">
              {weekDays[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              {" - "}
              {weekDays[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </div>
            <button
              onClick={() => setWeekOffset(p => p + 1)}
              className="p-1 rounded-md text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((day, i) => {
              const date = weekDays[i];
              const dateStr = formatDate(date);
              const isSelected = dateStr === selectedDate;
              const hasMeeting = meetings.some(m => m.date === dateStr && m.status === "scheduled");
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`flex flex-col items-center py-2 rounded-lg border transition-colors ${
                    isSelected
                      ? "border-indigo-500/30 bg-indigo-500/10"
                      : "border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.03]"
                  }`}
                >
                  <span className="text-[9px] text-slate-500">{day}</span>
                  <span className={`text-sm font-semibold ${isSelected ? "text-indigo-300" : isToday(date) ? "text-sky-400" : "text-slate-300"}`}>
                    {date.getDate()}
                  </span>
                  {hasMeeting && (
                    <div className="w-1 h-1 rounded-full bg-indigo-400 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Time Slots */}
          <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
              Available Slots for {new Date(selectedDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {timeSlots.map(slot => {
                const isBooked = meetingsForDate.some(m => m.time === slot.time);
                const isSelected = selectedSlot === slot.time && !isBooked;
                return (
                  <button
                    key={slot.time}
                    onClick={() => !isBooked && setSelectedSlot(slot.time)}
                    disabled={isBooked}
                    className={`text-[10px] px-2 py-1.5 rounded-md border transition-colors ${
                      isBooked
                        ? "border-rose-500/10 bg-rose-500/5 text-rose-400/50 cursor-not-allowed"
                        : isSelected
                          ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-300"
                          : slot.available
                            ? "border-white/[0.06] bg-white/[0.02] text-slate-300 hover:bg-white/[0.04]"
                            : "border-white/[0.03] bg-white/[0.01] text-slate-600 cursor-not-allowed"
                    }`}
                  >
                    {slot.time}
                    {isBooked && <span className="ml-1 text-[8px]">booked</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meetings for Selected Date */}
          {meetingsForDate.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                Scheduled on this day
              </div>
              {meetingsForDate.map(renderMeetingCard)}
            </div>
          )}
        </div>
      )}

      {/* ── Upcoming List View ── */}
      {activeView === "list" && (
        <div className="space-y-2">
          {upcomingMeetings.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-600">
              No upcoming meetings. Book one to get started.
            </div>
          )}
          {upcomingMeetings.map(meeting => (
            <div key={meeting.id}>
              {renderMeetingCard(meeting)}
            </div>
          ))}
        </div>
      )}

      {/* ── History View ── */}
      {activeView === "history" && (
        <div className="space-y-2">
          {pastMeetings.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-600">
              No past meetings yet.
            </div>
          )}
          {pastMeetings.map(meeting => (
            <div key={meeting.id}>
              {renderHistoryCard(meeting)}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  function renderMeetingCard(meeting: Meeting) {
    const mt = TYPE_MAP[meeting.type];
    const TypeIcon = mt.icon;
    const countdown = getCountdown(meeting.date, meeting.time);

    return (
      <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${mt.color}15` }}>
          <TypeIcon className="w-4 h-4" style={{ color: mt.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-200 truncate">{meeting.prospectName}</span>
            <span className="text-[9px] px-1 py-0.5 rounded bg-slate-500/10 text-slate-500">{mt.label}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-400">
              {new Date(meeting.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              {" · "}{meeting.time}
              {" · "}{meeting.duration}min
            </span>
            <span className="text-[9px] text-slate-600">{meeting.location}</span>
          </div>
          {meeting.notes && (
            <div className="text-[9px] text-slate-600 truncate mt-0.5">{meeting.notes}</div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1 text-[9px] text-indigo-400">
            <Timer className="w-2.5 h-2.5" />
            {countdown}
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => completeMeeting(meeting.id)}
              className="p-1 rounded-md text-slate-600 hover:text-emerald-400 transition-colors"
              title="Mark complete"
            >
              <CheckCircle2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => cancelMeeting(meeting.id)}
              className="p-1 rounded-md text-slate-600 hover:text-rose-400 transition-colors"
              title="Cancel"
            >
              <XCircle className="w-3 h-3" />
            </button>
            <button
              onClick={() => deleteMeeting(meeting.id)}
              className="p-1 rounded-md text-slate-600 hover:text-rose-400 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderHistoryCard(meeting: Meeting) {
    const mt = TYPE_MAP[meeting.type];
    const TypeIcon = mt.icon;
    const statusColor = meeting.status === "completed" ? "text-emerald-400" : meeting.status === "cancelled" ? "text-rose-400" : "text-amber-400";

    return (
      <div className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.015] flex items-center gap-3 opacity-70">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${mt.color}10` }}>
          <TypeIcon className="w-3.5 h-3.5" style={{ color: mt.color, opacity: 0.7 }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-300 truncate">{meeting.prospectName}</span>
            <span className={`text-[9px] font-medium ${statusColor}`}>{meeting.status}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {new Date(meeting.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            {" · "}{meeting.time}
            {" · "}{mt.label}
          </div>
        </div>
        <button
          onClick={() => deleteMeeting(meeting.id)}
          className="p-1 rounded-md text-slate-700 hover:text-rose-400 transition-colors shrink-0"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    );
  }
}
