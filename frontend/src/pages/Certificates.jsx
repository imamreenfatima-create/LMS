import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Award, Hash, Calendar, Download, Sparkles, Eye, Linkedin, Share2 } from "lucide-react";

export default function Certificates() {
  const [certs, setCerts] = useState([]);
  const [sampleOpen, setSampleOpen] = useState(false);
  useEffect(() => { api.get("/learner/certificates").then(r => setCerts(r.data)); }, []);
  const sampleImg = `${process.env.REACT_APP_BACKEND_URL}/api/certificates/sample/image`;
  const samplePdf = `${process.env.REACT_APP_BACKEND_URL}/api/certificates/sample/pdf`;
  return (
    <div className="space-y-6" data-testid="certificates-page">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500">Achievements</div>
          <h1 className="font-heading text-4xl font-bold mt-1">Your certificates</h1>
        </div>
        <button data-testid="preview-sample-cert" onClick={()=>setSampleOpen(true)} className="px-4 py-2 border border-slate-300 rounded-sm text-sm flex items-center gap-2 hover:bg-slate-50">
          <Eye className="w-3.5 h-3.5" /> Preview sample certificate
        </button>
      </div>

      {/* Motivational banner — always visible */}
      <div className="hg-card overflow-hidden relative" data-testid="motivation-banner">
        <div className="grid md:grid-cols-[1fr_auto]">
          <div className="p-6">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-[#E11D48]">
              <Sparkles className="w-3.5 h-3.5" /> Earn a verified credential
            </div>
            <h2 className="font-heading text-2xl font-bold mt-2">Finish a course. Walk away with a certificate.</h2>
            <p className="text-slate-600 text-sm mt-2 max-w-xl">
              Complete 90% of any course plus its quizzes and Hireginie issues you a signed PDF certificate with a unique QR code that you can share on LinkedIn, attach to job applications, or showcase in performance reviews.
            </p>
            <button data-testid="preview-sample-cert-banner" onClick={()=>setSampleOpen(true)} className="hg-btn-primary mt-4 text-sm">See a sample certificate</button>
          </div>
          <div className="bg-slate-50 border-l border-slate-200 p-6 flex flex-col items-center justify-center min-w-[220px]">
            <Award className="w-12 h-12 text-[#E11D48]" />
            <div className="text-3xl font-heading font-bold mt-2">{certs.length}</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mt-1">Yours so far</div>
          </div>
        </div>
      </div>

      {certs.length === 0 ? (
        <div className="hg-card p-12 text-center text-slate-500">No certificates yet — complete a course (≥90%) and pass its quizzes to earn your first one.</div>
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
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={`${process.env.REACT_APP_BACKEND_URL}/api/learner/certificates/${c.id}/pdf?token=${localStorage.getItem('hg_token')}`}
                   onClick={async (e) => {
                     e.preventDefault();
                     const res = await api.get(`/learner/certificates/${c.id}/pdf`, { responseType: "blob" });
                     const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
                     const a = document.createElement('a'); a.href = url; a.download = `${c.certificate_no}.pdf`; a.click();
                     window.URL.revokeObjectURL(url);
                   }}
                   data-testid={`cert-download-${c.id}`}
                   className="inline-flex items-center gap-2 px-4 py-2 bg-[#E11D48] text-white text-sm rounded-sm hover:bg-[#BE123C]">
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </a>
                {(() => {
                  const verifyUrl = `${process.env.REACT_APP_BACKEND_URL}/api/certificates/verify/${c.verify_code}`;
                  const issueDate = new Date(c.issued_at);
                  const shareText = `Just earned a certificate in "${c.course_title}" from Hireginie LMS! Cert # ${c.certificate_no}. Verify here:`;
                  const liShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}&summary=${encodeURIComponent(shareText)}`;
                  const liAdd = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(c.course_title)}&organizationName=${encodeURIComponent("Hireginie")}&issueYear=${issueDate.getFullYear()}&issueMonth=${issueDate.getMonth()+1}&certUrl=${encodeURIComponent(verifyUrl)}&certId=${encodeURIComponent(c.certificate_no)}`;
                  return (
                    <>
                      <a href={liShare} target="_blank" rel="noreferrer" data-testid={`linkedin-share-${c.id}`}
                         className="inline-flex items-center gap-2 px-3 py-2 bg-[#0A66C2] text-white text-sm rounded-sm hover:bg-[#004182]">
                        <Linkedin className="w-3.5 h-3.5" /> Share on LinkedIn
                      </a>
                      <a href={liAdd} target="_blank" rel="noreferrer" data-testid={`linkedin-add-${c.id}`}
                         className="inline-flex items-center gap-2 px-3 py-2 border border-[#0A66C2] text-[#0A66C2] text-sm rounded-sm hover:bg-[#0A66C2]/5">
                        <Linkedin className="w-3.5 h-3.5" /> Add to profile
                      </a>
                      <button onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(verifyUrl);
                          (await import("sonner")).toast.success("Verify link copied");
                        } catch {}
                      }} data-testid={`copy-verify-${c.id}`}
                         className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 text-slate-700 text-sm rounded-sm hover:bg-slate-50">
                        <Share2 className="w-3.5 h-3.5" /> Copy link
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}

      {sampleOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={()=>setSampleOpen(false)} data-testid="sample-cert-modal">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[92vh] flex flex-col" onClick={(e)=>e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-heading text-xl font-bold">Sample certificate</div>
                <div className="text-xs text-slate-500">Yours will look like this — with <em>your</em> name and the course you complete.</div>
              </div>
              <div className="flex items-center gap-2">
                <a href={samplePdf} target="_blank" rel="noreferrer" data-testid="sample-pdf-download"
                   className="px-3 py-1.5 border border-slate-300 rounded-sm text-xs flex items-center gap-1.5 hover:bg-slate-50">
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </a>
                <button onClick={()=>setSampleOpen(false)} className="p-2 hover:bg-slate-100 rounded">✕</button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-slate-100 flex items-center justify-center">
              <img src={sampleImg} alt="Sample certificate preview"
                   className="max-w-full h-auto rounded shadow-xl"
                   data-testid="sample-cert-img" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
