import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { toast } from "sonner";

export default function AssignmentSubmit() {
  const { id } = useParams();
  const nav = useNavigate();
  const [text, setText] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [assignment, setAssignment] = useState(null);

  useEffect(() => {
    api.get("/learner/dashboard").then(r => {
      const a = (r.data.pending_assignments || []).find(x => x.id === id);
      setAssignment(a || { id, title: "Assignment", description: "" });
    });
  }, [id]);

  const upload = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" }});
      setFileUrl(data.url); toast.success("File uploaded");
    } catch { toast.error("Upload failed"); } finally { setUploading(false); }
  };

  const submit = async () => {
    setBusy(true);
    try {
      await api.post("/learner/assignment/submit", { assignment_id: id, text_submission: text, file_url: fileUrl });
      toast.success("Submitted! (+20 pts)");
      nav("/app/dashboard");
    } catch { toast.error("Submission failed"); }
    finally { setBusy(false); }
  };

  if (!assignment) return <div className="text-slate-500">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto" data-testid="assignment-submit">
      <div className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500">Practical assignment</div>
      <h1 className="font-heading text-3xl font-bold mt-1">{assignment.title}</h1>
      <p className="text-slate-600 mt-2">{assignment.description}</p>
      {assignment.instructions && (
        <div className="mt-4 hg-card p-4 text-sm text-slate-700"><div className="font-semibold mb-1">Instructions</div>{assignment.instructions}</div>
      )}
      <div className="mt-6 hg-card p-6 space-y-4">
        <label className="block">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Your response</div>
          <textarea data-testid="assignment-text" value={text} onChange={(e)=>setText(e.target.value)} rows={10} className="w-full px-4 py-3 border border-slate-300 rounded resize-y" placeholder="Write your answer here…" />
        </label>
        <label className="block">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Attach file (optional)</div>
          <input data-testid="assignment-file" type="file" onChange={(e)=>e.target.files[0] && upload(e.target.files[0])} className="text-sm" />
          {uploading && <div className="text-xs text-slate-500 mt-1">Uploading…</div>}
          {fileUrl && <div className="text-xs text-[#10B981] mt-1">✓ File attached</div>}
        </label>
        <button data-testid="submit-assignment-btn" onClick={submit} disabled={busy || (!text && !fileUrl)} className="hg-btn-primary">{busy ? "Submitting…" : "Submit assignment"}</button>
      </div>
    </div>
  );
}
