import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";

export default function AdminSubmissions() {
  const [subs, setSubs] = useState([]);
  const [open, setOpen] = useState(null);
  const [marks, setMarks] = useState(80);
  const [feedback, setFeedback] = useState("");

  const load = () => api.get("/admin/submissions").then(r => setSubs(r.data));
  useEffect(() => { load(); }, []);

  const evalSub = async () => {
    await api.post("/admin/submissions/evaluate", { submission_id: open.id, marks: Number(marks), feedback });
    toast.success("Evaluated");
    setOpen(null); load();
  };

  return (
    <div className="space-y-6" data-testid="admin-submissions">
      <div>
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500">Evaluation</div>
        <h1 className="font-heading text-4xl font-bold mt-1">Submissions</h1>
      </div>
      <div className="hg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-[10px] font-mono uppercase tracking-widest text-slate-500">
              <th className="p-3">Learner</th><th className="p-3">Submitted</th><th className="p-3">Status</th><th className="p-3">Marks</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subs.map(s => (
              <tr key={s.id} data-testid={`sub-${s.id}`}>
                <td className="p-3">{s.user_name}</td>
                <td className="p-3 text-slate-500">{new Date(s.submitted_at).toLocaleString()}</td>
                <td className="p-3"><span className={`text-xs font-mono uppercase ${s.status==='evaluated'?'text-[#10B981]':'text-[#F59E0B]'}`}>{s.status}</span></td>
                <td className="p-3 font-mono">{s.marks ?? "—"}</td>
                <td className="p-3 text-right">
                  <button data-testid={`eval-${s.id}`} onClick={()=>{setOpen(s); setMarks(s.marks||80); setFeedback(s.feedback||"");}} className="px-3 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50">Review</button>
                </td>
              </tr>
            ))}
            {subs.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-slate-500">No submissions yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={()=>setOpen(null)}>
          <div className="bg-white rounded-lg p-6 max-w-lg w-full" onClick={(e)=>e.stopPropagation()}>
            <h2 className="font-heading text-xl font-bold mb-2">Evaluate submission</h2>
            <div className="text-sm text-slate-600 mb-3">By {open.user_name}</div>
            {open.text_submission && <div className="bg-slate-50 p-3 rounded text-sm mb-3 max-h-48 overflow-y-auto whitespace-pre-wrap">{open.text_submission}</div>}
            {open.file_url && <a href={open.file_url} className="text-[#E11D48] text-sm underline">Attached file</a>}
            <div className="space-y-3 mt-4">
              <input data-testid="eval-marks" type="number" value={marks} onChange={(e)=>setMarks(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded" placeholder="Marks (0-100)" />
              <textarea data-testid="eval-feedback" value={feedback} onChange={(e)=>setFeedback(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded" placeholder="Feedback" />
            </div>
            <button data-testid="submit-eval-btn" onClick={evalSub} className="hg-btn-primary w-full mt-4">Save evaluation</button>
          </div>
        </div>
      )}
    </div>
  );
}
