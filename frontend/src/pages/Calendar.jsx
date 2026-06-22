import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Calendar as CalIcon, Plus, X, ChevronLeft, ChevronRight, MapPin, Clock, Trash2, Pencil } from "lucide-react";
import { useAuth } from "../lib/auth";
import { Link } from "react-router-dom";

const EVENT_COLORS = {
  event: "#E11D48", webinar: "#3B82F6", training: "#10B981",
  deadline: "#F59E0B", meeting: "#8B5CF6",
};

const EVENT_TYPES = [
  { value: "event", label: "Event" },
  { value: "webinar", label: "Webinar" },
  { value: "training", label: "Training Session" },
  { value: "deadline", label: "Deadline" },
  { value: "meeting", label: "Meeting" },
];

function ymd(d) { return d.toISOString().slice(0, 10); }
function sameDay(a, b) { return ymd(a) === ymd(b); }

export default function CalendarPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "trainer";
  const [events, setEvents] = useState([]);
  const [cursor, setCursor] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: "", description: "", event_type: "event",
    start_date: "", end_date: "", location: "",
    audience: "all", department: "", color: "#E11D48",
  });
  const [selectedDay, setSelectedDay] = useState(new Date());

  const load = () => api.get("/calendar/events").then(r => setEvents(r.data));
  useEffect(() => { load(); }, []);

  const monthGrid = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach(e => {
      const key = (e.start_date || "").slice(0, 10);
      if (!key) return;
      (map[key] = map[key] || []).push(e);
    });
    return map;
  }, [events]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.start_date) return toast.error("Title and start date required");
    const payload = { ...form, color: EVENT_COLORS[form.event_type] || form.color };
    try {
      if (editing) {
        await api.patch(`/admin/calendar/events/${editing.id}`, payload);
        toast.success("Event updated");
      } else {
        await api.post("/admin/calendar/events", payload);
        toast.success("Event created");
      }
      setOpen(false); setEditing(null);
      setForm({ title: "", description: "", event_type: "event", start_date: "", end_date: "", location: "", audience: "all", department: "", color: "#E11D48" });
      load();
    } catch (err) { toast.error(err?.response?.data?.detail || "Failed"); }
  };

  const startEdit = (ev) => {
    setEditing(ev);
    setForm({
      title: ev.title, description: ev.description || "", event_type: ev.event_type || "event",
      start_date: (ev.start_date || "").slice(0, 16), end_date: (ev.end_date || "").slice(0, 16),
      location: ev.location || "", audience: ev.audience || "all",
      department: ev.department || "", color: ev.color || "#E11D48",
    });
    setOpen(true);
  };

  const remove = async (id) => {
    if (!confirm("Delete this event?")) return;
    await api.delete(`/admin/calendar/events/${id}`);
    toast.success("Event deleted"); load();
  };

  const selectedDayEvents = (eventsByDay[ymd(selectedDay)] || []).sort((a, b) => (a.start_date > b.start_date ? 1 : -1));
  const upcoming = events
    .filter(e => new Date(e.start_date) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => (a.start_date > b.start_date ? 1 : -1))
    .slice(0, 6);

  const monthName = cursor.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6" data-testid="calendar-page">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500">Schedule</div>
          <h1 className="font-heading text-4xl font-bold mt-1">Calendar</h1>
          <p className="text-slate-600 mt-2">Training sessions, webinars, course deadlines and team events — all in one place.</p>
        </div>
        {isAdmin && (
          <button data-testid="new-event-btn" onClick={() => { setEditing(null); setOpen(true); }} className="hg-btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New event
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2 hg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <button data-testid="cal-prev" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="p-2 hover:bg-slate-100 rounded-md"><ChevronLeft className="w-4 h-4" /></button>
            <div className="font-heading text-xl font-semibold" data-testid="cal-month">{monthName}</div>
            <button data-testid="cal-next" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="p-2 hover:bg-slate-100 rounded-md"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="text-center py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthGrid.map((d, i) => {
              if (!d) return <div key={i} className="h-20 bg-slate-50/40 rounded" />;
              const isSelected = sameDay(d, selectedDay);
              const isToday = sameDay(d, new Date());
              const evs = eventsByDay[ymd(d)] || [];
              return (
                <button
                  key={i}
                  data-testid={`cal-day-${ymd(d)}`}
                  onClick={() => setSelectedDay(d)}
                  className={`h-20 p-1.5 rounded text-left transition-colors border ${
                    isSelected ? "border-[#E11D48] bg-rose-50" : "border-transparent hover:bg-slate-50"
                  }`}
                >
                  <div className={`text-xs font-semibold ${isToday ? "text-[#E11D48]" : "text-slate-700"}`}>{d.getDate()}</div>
                  <div className="mt-1 space-y-0.5">
                    {evs.slice(0, 2).map(e => (
                      <div key={e.id} className="truncate text-[10px] px-1 py-0.5 rounded text-white" style={{ backgroundColor: e.color }}>
                        {e.title}
                      </div>
                    ))}
                    {evs.length > 2 && <div className="text-[10px] text-slate-500">+{evs.length - 2} more</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-5">
          <div className="hg-card p-5">
            <div className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3">
              {selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </div>
            {selectedDayEvents.length === 0 ? (
              <div className="text-sm text-slate-500">No events scheduled.</div>
            ) : (
              <div className="space-y-3">
                {selectedDayEvents.map(e => (
                  <div key={e.id} className="border-l-4 pl-3 py-1.5" style={{ borderColor: e.color }} data-testid={`day-event-${e.id}`}>
                    <div className="font-semibold text-sm flex items-center justify-between">
                      <span>{e.title}</span>
                      {isAdmin && !e.auto && (
                        <span className="flex gap-1">
                          <button onClick={() => startEdit(e)} className="text-slate-400 hover:text-slate-700"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => remove(e.id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-3 h-3" /></button>
                        </span>
                      )}
                    </div>
                    {e.description && <div className="text-xs text-slate-600 mt-1">{e.description}</div>}
                    <div className="flex gap-3 mt-1.5 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {e.start_date?.slice(11, 16) || "All-day"}</span>
                      {e.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {e.location}</span>}
                    </div>
                    {e.course_id && (
                      <Link to={`/app/course/${e.course_id}`} className="inline-block text-[11px] text-[#E11D48] hover:underline mt-1">View course →</Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="hg-card p-5">
            <div className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3">Upcoming</div>
            {upcoming.length === 0 ? (
              <div className="text-sm text-slate-500">Nothing planned.</div>
            ) : (
              <div className="space-y-2.5">
                {upcoming.map(e => (
                  <button key={e.id} onClick={() => setSelectedDay(new Date(e.start_date))} className="w-full text-left flex items-start gap-3 hover:bg-slate-50 rounded p-2 -m-2">
                    <div className="w-1 h-10 rounded" style={{ backgroundColor: e.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{e.title}</div>
                      <div className="text-[11px] text-slate-500">{new Date(e.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {e.event_type}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit modal (admin only) */}
      {open && isAdmin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="event-modal">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-heading text-xl font-semibold">{editing ? "Edit event" : "New event"}</h3>
              <button onClick={() => { setOpen(false); setEditing(null); }} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submit} className="p-5 space-y-4">
              <input data-testid="ev-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" className="w-full px-3 py-2 border border-slate-300 rounded-md" />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)" rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-md" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Type</label>
                  <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-md">
                    {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Audience</label>
                  <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-md">
                    <option value="all">Everyone</option>
                    <option value="learners">Learners only</option>
                    <option value="admins">Admins only</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Start *</label>
                  <input data-testid="ev-start" required type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-md" />
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">End</label>
                  <input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-md" />
                </div>
              </div>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location / Meeting link" className="w-full px-3 py-2 border border-slate-300 rounded-md" />
              <button data-testid="ev-submit" type="submit" className="w-full hg-btn-primary py-2.5">{editing ? "Update" : "Create"} event</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
