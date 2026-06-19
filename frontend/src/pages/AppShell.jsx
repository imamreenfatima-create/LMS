import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { LOGO_URL, api } from "../lib/api";
import {
  LayoutDashboard, BookOpen, Award, Trophy, Bell, Search, LogOut, Users,
  GraduationCap, Settings, MessageSquareText, FileSpreadsheet, ClipboardList,
} from "lucide-react";
import AiChatbot from "./AiChatbot";

export default function AppShell() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [notifs, setNotifs] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  React.useEffect(() => {
    api.get("/notifications").then((r) => setNotifs(r.data)).catch(() => {});
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "trainer";
  const isSuperAdmin = user?.role === "admin";

  const learnerNav = [
    { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/library", label: "Course Library", icon: BookOpen },
    { to: "/app/certificates", label: "Certificates", icon: Award },
    { to: "/app/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/app/assignments", label: "Assignments", icon: ClipboardList },
  ];
  const adminNav = [
    { to: "/admin/dashboard", label: "Analytics", icon: LayoutDashboard },
    { to: "/admin/users", label: "Users", icon: Users, super: true },
    { to: "/admin/courses", label: "Courses", icon: GraduationCap },
    { to: "/admin/submissions", label: "Submissions", icon: FileSpreadsheet },
    { to: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  const onSearch = (e) => {
    e.preventDefault();
    if (q.trim()) nav(`/app/search?q=${encodeURIComponent(q.trim())}`);
  };

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen flex" data-testid="app-shell">
      {/* Sidebar */}
      <aside className="hg-sidebar w-64 flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-[#1E293B] flex items-center gap-3">
          <img src={LOGO_URL} alt="" className="w-9 h-9 rounded-sm" />
          <div>
            <div className="font-heading text-lg font-bold text-white">Hireginie<span className="text-[#E11D48]">.</span></div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#64748B]">LMS</div>
          </div>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="px-4 text-[10px] font-mono uppercase tracking-widest text-[#64748B] mb-2">Learning</div>
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
              <div className="px-4 mt-6 text-[10px] font-mono uppercase tracking-widest text-[#64748B] mb-2">Administration</div>
              {adminNav.filter(n => !n.super || isSuperAdmin).map((n) => (
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
        <div className="p-4 border-t border-[#1E293B]">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-[#E11D48] text-white flex items-center justify-center text-sm font-semibold font-heading">
              {user?.full_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">{user?.full_name}</div>
              <div className="text-[10px] font-mono uppercase text-[#94A3B8]">{user?.login_id} · {user?.role}</div>
            </div>
          </div>
          <button data-testid="logout-btn" onClick={logout} className="w-full mt-2 flex items-center gap-2 px-3 py-2 text-sm text-[#CBD5E1] hover:bg-[#1E293B] rounded">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center gap-4">
          <form onSubmit={onSearch} className="flex-1 max-w-xl relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              data-testid="global-search-input"
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="Search courses, modules, skills…"
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md text-sm bg-slate-50 focus:bg-white focus:outline-none focus:border-[#E11D48]"
            />
          </form>
          <div className="relative">
            <button data-testid="notifications-btn" onClick={()=>setShowNotifs(!showNotifs)} className="relative p-2 hover:bg-slate-100 rounded-md">
              <Bell className="w-5 h-5 text-slate-700" />
              {unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-[#E11D48] rounded-full" />}
            </button>
            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-slate-100 font-semibold text-sm">Notifications</div>
                {notifs.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-500">No notifications</div>
                ) : notifs.slice(0,10).map((n)=>(
                  <div key={n.id} className={`p-3 border-b border-slate-100 ${n.read ? "" : "bg-rose-50/40"}`}>
                    <div className="text-sm font-medium">{n.title}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{n.body}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold">{user?.points || 0} <span className="text-xs text-slate-500 font-mono">pts</span></div>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Your score</div>
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
