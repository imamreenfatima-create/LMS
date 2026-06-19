import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Trophy } from "lucide-react";
import { useAuth } from "../lib/auth";

const SCOPES = ["daily", "weekly", "monthly", "overall"];

export default function Leaderboard() {
  const [scope, setScope] = useState("overall");
  const [rows, setRows] = useState([]);
  const { user } = useAuth();
  useEffect(() => { api.get(`/leaderboard?scope=${scope}`).then(r => setRows(r.data)); }, [scope]);
  return (
    <div className="space-y-6" data-testid="leaderboard-page">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500">Compete · Learn · Win</div>
          <h1 className="font-heading text-4xl font-bold mt-1">Leaderboard</h1>
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded">
          {SCOPES.map(s => (
            <button key={s} data-testid={`scope-${s}`} onClick={()=>setScope(s)} className={`px-3 py-1.5 text-xs uppercase tracking-wider font-semibold rounded ${scope===s ? "bg-white shadow-sm text-[#E11D48]" : "text-slate-600"}`}>{s}</button>
          ))}
        </div>
      </div>
      <div className="hg-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-[10px] font-mono uppercase tracking-widest text-slate-500">
              <th className="p-4 w-16">Rank</th><th className="p-4">Learner</th><th className="p-4">Department</th><th className="p-4 text-right">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(r => {
              const isMe = r.user_id === user?.id;
              return (
                <tr key={r.user_id} className={`${isMe ? "bg-rose-50/40" : ""}`} data-testid={`lb-row-${r.rank}`}>
                  <td className="p-4">
                    {r.rank <= 3 ? (
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm ${r.rank===1?"bg-[#F59E0B]":r.rank===2?"bg-slate-400":"bg-orange-700"}`}>{r.rank}</span>
                    ) : <span className="font-mono text-slate-500">#{r.rank}</span>}
                  </td>
                  <td className="p-4">
                    <div className="font-medium">{r.name} {isMe && <span className="text-xs text-[#E11D48] ml-1">(You)</span>}</div>
                    <div className="text-xs font-mono text-slate-500">{r.login_id}</div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{r.department || "—"}</td>
                  <td className="p-4 text-right"><span className="font-mono font-semibold">{r.points}</span> <span className="text-xs text-slate-500">pts</span></td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={4} className="p-12 text-center text-slate-500">No activity in this period yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
