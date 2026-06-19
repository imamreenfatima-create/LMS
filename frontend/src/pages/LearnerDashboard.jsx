import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Link } from "react-router-dom";
import { BookOpen, Award, TrendingUp, Clock, Trophy, ArrowRight } from "lucide-react";

export default function LearnerDashboard() {
  const [data, setData] = useState(null);
  const [recs, setRecs] = useState([]);
  useEffect(() => {
    api.get("/learner/dashboard").then(r => setData(r.data));
    api.get("/ai/recommend").then(r => setRecs(r.data.recommendations || []));
  }, []);
  if (!data) return <div className="text-slate-500">Loading…</div>;

  const stats = [
    { label: "Assigned Courses", value: data.courses.length, icon: BookOpen, color: "text-[#E11D48]" },
    { label: "Certificates", value: data.certificates_count, icon: Award, color: "text-[#10B981]" },
    { label: "Leaderboard Rank", value: data.rank ? `#${data.rank}` : "—", icon: Trophy, color: "text-[#F59E0B]" },
    { label: "Learning Hours", value: data.learning_hours, icon: Clock, color: "text-slate-700" },
  ];

  return (
    <div className="space-y-8" data-testid="learner-dashboard">
      <div>
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500">Your learning</div>
        <h1 className="font-heading text-4xl font-bold mt-1">Welcome back.</h1>
        <p className="text-slate-600 mt-2 max-w-2xl">Continue where you left off. {data.pending_assignments.length} pending assignment{data.pending_assignments.length !== 1 ? "s" : ""}.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="hg-card p-5" data-testid={`stat-${s.label.toLowerCase().replace(/ /g,'-')}`}>
            <div className="flex items-center justify-between mb-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">{s.label}</span>
            </div>
            <div className="font-heading text-3xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-heading text-2xl font-semibold">Continue learning</h2>
          <Link to="/app/library" className="text-sm text-[#E11D48] hover:underline flex items-center gap-1">Browse library <ArrowRight className="w-3.5 h-3.5" /></Link>
        </div>
        {data.courses.length === 0 ? (
          <div className="hg-card p-8 text-center text-slate-500">No courses assigned yet. Visit the library.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.courses.map(c => (
              <Link key={c.id} to={`/app/course/${c.id}`} className="hg-card overflow-hidden group" data-testid={`course-card-${c.id}`}>
                <div className="h-40 bg-slate-100 relative overflow-hidden">
                  <img src={c.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider">{c.category}</div>
                </div>
                <div className="p-5">
                  <div className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">{c.level}</div>
                  <div className="font-heading font-semibold text-lg mt-1 line-clamp-2">{c.title}</div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                      <span>Progress</span><span className="font-mono">{c.progress_pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#E11D48]" style={{width: `${c.progress_pct}%`}} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {data.pending_assignments.length > 0 && (
        <section>
          <h2 className="font-heading text-2xl font-semibold mb-4">Pending assignments</h2>
          <div className="hg-card divide-y divide-slate-100">
            {data.pending_assignments.slice(0,5).map(a => (
              <Link key={a.id} to={`/app/assignment/${a.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50">
                <div>
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{a.description}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {recs.length > 0 && (
        <section>
          <div className="flex items-baseline gap-2 mb-4">
            <h2 className="font-heading text-2xl font-semibold">Recommended for you</h2>
            <TrendingUp className="w-4 h-4 text-[#E11D48]" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recs.slice(0,3).map(c => (
              <Link key={c.id} to={`/app/course/${c.id}`} className="hg-card p-5">
                <div className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">{c.category}</div>
                <div className="font-heading font-semibold mt-1">{c.title}</div>
                <div className="text-xs text-slate-500 mt-2 line-clamp-2">{c.description}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
