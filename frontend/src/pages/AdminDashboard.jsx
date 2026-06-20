import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { Users, GraduationCap, Award, BarChart3, CheckCircle2, ClipboardList } from "lucide-react";

const COLORS = ["#E11D48", "#0B1121", "#F59E0B", "#10B981", "#6366F1", "#64748B"];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [lessons, setLessons] = useState([]);
  useEffect(() => {
    api.get("/admin/analytics").then(r => setData(r.data));
    api.get("/admin/analytics/lessons").then(r => setLessons(r.data.lessons || []));
  }, []);
  if (!data) return <div className="text-slate-500">Loading…</div>;
  const { kpis, top_performers, engagement, departments } = data;
  const kpiCards = [
    { label: "Total Users", value: kpis.total_users, icon: Users, color: "bg-[#0B1121]" },
    { label: "Active Learners", value: kpis.learners, icon: GraduationCap, color: "bg-[#E11D48]" },
    { label: "Courses", value: kpis.courses, icon: BarChart3, color: "bg-[#F59E0B]" },
    { label: "Certificates", value: kpis.certificates, icon: Award, color: "bg-[#10B981]" },
    { label: "Submissions", value: kpis.submissions, icon: ClipboardList, color: "bg-indigo-600" },
    { label: "Pass Rate", value: `${kpis.pass_rate}%`, icon: CheckCircle2, color: "bg-emerald-700" },
  ];
  return (
    <div className="space-y-8" data-testid="admin-dashboard">
      <div>
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500">Control room</div>
        <h1 className="font-heading text-4xl font-bold mt-1">Analytics</h1>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map(k => (
          <div key={k.label} className="hg-card p-5" data-testid={`kpi-${k.label.toLowerCase().replace(/ /g,'-')}`}>
            <div className={`w-9 h-9 rounded ${k.color} flex items-center justify-center text-white`}><k.icon className="w-4 h-4" /></div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mt-3">{k.label}</div>
            <div className="font-heading text-2xl font-bold mt-1">{k.value}</div>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="hg-card p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Course engagement</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={engagement.slice(0,8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="course" tick={{fontSize: 10}} angle={-25} textAnchor="end" height={60} interval={0} />
              <YAxis tick={{fontSize: 11}} />
              <Tooltip />
              <Bar dataKey="enrolled" fill="#0B1121" radius={[2,2,0,0]} />
              <Bar dataKey="completed" fill="#E11D48" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="hg-card p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">By department</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={departments} dataKey="users" nameKey="department" outerRadius={90} label={(e)=>e.department}>
                {departments.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="hg-card p-6">
        <h2 className="font-heading text-lg font-semibold mb-4">Top performers</h2>
        <div className="divide-y divide-slate-100">
          {top_performers.map((u) => (
            <div key={u.id} className="flex items-center justify-between py-3" data-testid={`top-perf-${u.id}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-mono text-sm">{top_performers.indexOf(u)+1}</div>
                <div>
                  <div className="font-medium text-sm">{u.full_name}</div>
                  <div className="text-xs text-slate-500 font-mono">{u.login_id} · {u.department}</div>
                </div>
              </div>
              <div className="font-mono font-semibold">{u.points} <span className="text-xs text-slate-500">pts</span></div>
            </div>
          ))}
        </div>
      </div>

      <div className="hg-card p-6" data-testid="lesson-engagement-panel">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold">Lesson engagement — total time spent</h2>
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Top 10</span>
        </div>
        {lessons.length === 0 ? (
          <div className="text-sm text-slate-500 py-6 text-center">No engagement data yet — learners need to open lessons.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-mono uppercase tracking-widest text-slate-500 border-b border-slate-200">
                <th className="py-2">Lesson</th><th className="py-2">Course</th><th className="py-2">Type</th>
                <th className="py-2 text-right">Total time</th><th className="py-2 text-right">Sessions</th>
                <th className="py-2 text-right">Learners</th><th className="py-2 text-right">Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lessons.slice(0,10).map(l => {
                const mm = String(Math.floor(l.total_seconds/60)).padStart(2,'0');
                const ss = String(l.total_seconds%60).padStart(2,'0');
                const avgMin = (l.avg_seconds/60).toFixed(1);
                return (
                  <tr key={l.lesson_id} data-testid={`lesson-eng-${l.lesson_id}`}>
                    <td className="py-2 pr-3 font-medium">{l.lesson_title}</td>
                    <td className="py-2 pr-3 text-slate-500 text-xs">{l.course_title}</td>
                    <td className="py-2 pr-3"><span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-slate-100 rounded">{l.content_type}</span></td>
                    <td className="py-2 text-right font-mono">{mm}:{ss}</td>
                    <td className="py-2 text-right font-mono">{l.sessions}</td>
                    <td className="py-2 text-right font-mono">{l.unique_users}</td>
                    <td className="py-2 text-right font-mono">{avgMin}m</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
