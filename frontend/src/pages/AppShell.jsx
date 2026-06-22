import React, { useState, useMemo } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { LOGO_URL, api } from "../lib/api";
import {
  LayoutDashboard, BookOpen, Award, Trophy, Bell, Search, LogOut, Users,
  GraduationCap, Settings, MessageSquareText, FileSpreadsheet, ClipboardList,
  Calendar, Megaphone, CheckCheck,
} from "lucide-react";
import AiChatbot from "./AiChatbot";

export default function AppShell() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [notifs, setNotifs] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  React.useEffect(() => {
    const load = () => api.get("/notifications").then((r) => setNotifs(r.data)).catch(() => {});
    load();
    const t = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(t);
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "trainer";
  const isSuperAdmin = user?.role === "admin";

  const learnerNav = useMemo(() => [
    { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/library", label: "Course Library", icon: BookOpen },
    { to: "/app/certificates", label: "Certificates", icon: Award },
    { to: "/app/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/app/assignments", label: "Assignments", icon: ClipboardList },
    { to: "/app/calendar", label: "Calendar", icon: Calendar },
    { to: "/app/announcements", label: "Announcements", icon: Megaphone },
  ], []);
  const adminNav = useMemo(() => [
    { to: "/admin/dashboard", label: "Analytics", icon: LayoutDashboard },
    { to: "/admin/users", label: "Users", icon: Users, super: true },
    { to: "/admin/courses", label: "Courses", icon: GraduationCap },
    { to: "/admin/submissions", label: "Submissions", icon: FileSpreadsheet },
    { to: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/admin/calendar", label: "Calendar", icon: Calendar },
    { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  ].filter(n => !n.super || isSuperAdmin), [isSuperAdmin]);

  const onSearch = (e) => {
    e.preventDefault();
    if (q.trim()) nav(`/app/search?q=${encodeURIComponent(q.trim())}`);
  };

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen flex" data-testid="app-shell">
      {/* Sidebar */}
      <aside className="hg-sidebar w-64 flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center gap-3">
          <img src={LOGO_URL} alt="" className="w-9 h-9 rounded-sm" />
          <div className="leading-tight">
            <div className="font-heading text-lg font-bold text-slate-900 tracking-tight">HIREGINIE</div>
            <div className="text-[11px] font-semibold text-slate-900 tracking-wide">Talent Cloud</div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mt-0.5">Learning Management System</div>
          </div>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="px-4 text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Learning</div>
          {learnerNav.map((n) => (
            <NavLink
              data-testid={`nav-${n.label.toLowerCase().replace(/ /g,'-')}`}
              key={n.to} to={n.to}
              className={({isActive}) => `flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${isActive ? "active" : ""}`}
            >
              <n.icon className="w-4 h-4" /> {n.label}
            </NavLink>
          ))}
          {isAdmin && (
            <>
              <div className="px-4 mt-6 text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Administration</div>
              {adminNav.map((n) => (
                <NavLink
                  data-testid={`nav-admin-${n.label.toLowerCase()}`}
                  key={n.to} to={n.to}
                  className={({isActive}) => `flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${isActive ? "active" : ""}`}
                >
                  <n.icon className="w-4 h-4" /> {n.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-[#E11D48] text-white flex items-center justify-center text-sm font-semibold font-heading">
              {user?.full_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-900 truncate">{user?.full_name}</div>
              <div className="text-[10px] font-mono uppercase text-slate-500">{user?.login_id} · {user?.role}</div>
            </div>
          </div>
          <button data-testid="logout-btn" onClick={logout} className="w-full mt-2 flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-rose-50 hover:text-[#E11D48] rounded">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 hg-topbar px-6 flex items-center gap-4 shadow-sm">
          <form onSubmit={onSearch} className="flex-1 max-w-xl relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
            <input
              data-testid="global-search-input"
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="Search courses, modules, skills…"
              className="w-full pl-10 pr-4 py-2 rounded-md text-sm border focus:outline-none"
            />
          </form>
          <div className="relative">
            <button data-testid="notifications-btn" onClick={()=>setShowNotifs(!showNotifs)} className="relative p-2 hover:bg-white/10 rounded-md">
              <Bell className="w-5 h-5 text-white" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[#E11D48] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white" data-testid="notif-badge">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute right-0 mt-2 w-96 bg-white border border-slate-200 rounded-md shadow-lg z-50 max-h-[28rem] overflow-y-auto text-slate-900">
                <div className="p-3 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
                  <div className="font-semibold text-sm">Notifications {unread > 0 && <span className="text-xs text-slate-500">({unread} unread)</span>}</div>
                  {unread > 0 && (
                    <button
                      data-testid="mark-all-read-btn"
                      onClick={async () => {
                        await api.post("/notifications/read-all");
                        setNotifs((s) => s.map((n) => ({ ...n, read: true })));
                      }}
                      className="text-[11px] text-[#E11D48] hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                </div>
                {notifs.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No notifications yet
                  </div>
                ) : notifs.slice(0,20).map((n)=>(
                  <button
                    key={n.id}
                    onClick={async () => {
                      if (!n.read) {
                        await api.post(`/notifications/${n.id}/read`);
                        setNotifs((s) => s.map((x) => x.id === n.id ? { ...x, read: true } : x));
                      }
                    }}
                    className={`w-full text-left p-3 border-b border-slate-100 transition-colors hover:bg-slate-50 ${n.read ? "" : "bg-rose-50/40"}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && <span className="w-2 h-2 rounded-full bg-[#E11D48] mt-1.5 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900">{n.title}</div>
                        <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.body}</div>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">{new Date(n.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-white">{user?.points || 0} <span className="text-xs text-white/80 font-mono">pts</span></div>
            <div className="text-[10px] font-mono text-white/80 uppercase tracking-wider">Your score</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8 hg-fade" data-testid="main-content">
          <Outlet />
        </main>
      </div>
      <AiChatbot />
    </div>
  );
}
