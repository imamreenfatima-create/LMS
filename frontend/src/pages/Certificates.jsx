import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Award, Hash, Calendar, Download } from "lucide-react";

export default function Certificates() {
  const [certs, setCerts] = useState([]);
  useEffect(() => { api.get("/learner/certificates").then(r => setCerts(r.data)); }, []);
  return (
    <div className="space-y-6" data-testid="certificates-page">
      <div>
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500">Achievements</div>
        <h1 className="font-heading text-4xl font-bold mt-1">Your certificates</h1>
      </div>
      {certs.length === 0 ? (
        <div className="hg-card p-12 text-center text-slate-500">Complete a course (≥90%) and pass its quizzes to earn certificates.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {certs.map(c => (
            <div key={c.id} className="hg-card p-6 relative overflow-hidden" data-testid={`cert-${c.id}`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full opacity-50" />
              <Award className="w-8 h-8 text-[#E11D48] relative" />
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mt-4">Certificate of completion</div>
              <div className="font-heading text-xl font-bold mt-1">{c.course_title}</div>
              <div className="text-sm text-slate-600 mt-1">Awarded to <span className="font-semibold">{c.user_name}</span></div>
              <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-100 text-xs">
                <div><div className="flex items-center gap-1 text-slate-500"><Hash className="w-3 h-3" /> Certificate No.</div><div className="font-mono mt-1">{c.certificate_no}</div></div>
                <div><div className="flex items-center gap-1 text-slate-500"><Calendar className="w-3 h-3" /> Issued</div><div className="font-mono mt-1">{new Date(c.issued_at).toLocaleDateString()}</div></div>
              </div>
              <div className="mt-3 text-[10px] font-mono text-slate-400">Verify code: {c.verify_code}</div>
              <a href={`${process.env.REACT_APP_BACKEND_URL}/api/learner/certificates/${c.id}/pdf?token=${localStorage.getItem('hg_token')}`}
                 onClick={async (e) => {
                   e.preventDefault();
                   const { api } = await import("../lib/api");
                   const res = await api.get(`/learner/certificates/${c.id}/pdf`, { responseType: "blob" });
                   const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                   const a = document.createElement('a'); a.href = url; a.download = `${c.certificate_no}.pdf`; a.click();
                   window.URL.revokeObjectURL(url);
                 }}
                 data-testid={`cert-download-${c.id}`}
                 className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#E11D48] text-white text-sm rounded-sm hover:bg-[#BE123C]">
                <Download className="w-3.5 h-3.5" /> Download PDF
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
