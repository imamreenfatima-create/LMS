import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Link } from "react-router-dom";
import { ClipboardList } from "lucide-react";

export default function MyAssignments() {
  const [subs, setSubs] = useState([]);
  const [pending, setPending] = useState([]);
  useEffect(() => {
    api.get("/learner/submissions").then(r => setSubs(r.data));
    api.get("/learner/dashboard").then(r => setPending(r.data.pending_assignments || []));
  }, []);
  return (
    <div className="space-y-6" data-testid="my-assignments">
      <div>
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500">Practical work</div>
        <h1 className="font-heading text-4xl font-bold mt-1">Assignments</h1>
      </div>
      <section>
        <h2 className="font-heading text-xl font-semibold mb-3">Pending</h2>
        <div className="hg-card divide-y divide-slate-100">
          {pending.length === 0 ? <div className="p-6 text-slate-500 text-sm">No pending assignments.</div> :
            pending.map(a => (
              <Link key={a.id} to={`/app/assignment/${a.id}`} className="block p-4 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <ClipboardList className="w-4 h-4 text-[#E11D48]" />
                  <div className="flex-1"><div className="font-medium">{a.title}</div><div className="text-xs text-slate-500">{a.description}</div></div>
                  <span className="text-xs font-mono text-slate-500">{a.max_marks} marks</span>
                </div>
              </Link>
            ))}
        </div>
      </section>
      <section>
        <h2 className="font-heading text-xl font-semibold mb-3">My submissions</h2>
        <div className="hg-card divide-y divide-slate-100">
          {subs.length === 0 ? <div className="p-6 text-slate-500 text-sm">No submissions yet.</div> :
            subs.map(s => (
              <div key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">Submission · {new Date(s.submitted_at).toLocaleDateString()}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Status: <span className={s.status==='evaluated' ? "text-[#10B981]" : "text-[#F59E0B]"}>{s.status}</span></div>
                  </div>
                  {s.marks != null && <div className="font-mono font-semibold">{s.marks} marks</div>}
                </div>
                {s.feedback && <div className="text-xs text-slate-600 mt-2 italic">"{s.feedback}"</div>}
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
