import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Save, X, Upload, FileText, Youtube, BookOpen, Link as LinkIcon, ArrowLeft } from "lucide-react";

const CONTENT_TYPES = [
  { v: "video", l: "Video", icon: Youtube },
  { v: "youtube", l: "YouTube link", icon: Youtube },
  { v: "pdf", l: "PDF", icon: FileText },
  { v: "ppt", l: "PPT", icon: FileText },
  { v: "doc", l: "DOCX", icon: FileText },
  { v: "notes", l: "Notes (text)", icon: BookOpen },
  { v: "link", l: "External link", icon: LinkIcon },
];

export default function CourseEditor() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [addingLessonFor, setAddingLessonFor] = useState(null);
  const [editingLesson, setEditingLesson] = useState(null);

  const load = () => api.get(`/admin/courses/${id}/structure`).then(r => setData(r.data));
  useEffect(() => { load(); }, [id]);

  if (!data) return <div className="text-slate-500">Loading…</div>;

  const addModule = async () => {
    if (!newModuleTitle.trim()) return;
    await api.post("/admin/modules", { course_id: id, title: newModuleTitle, order: data.modules.length });
    setNewModuleTitle(""); toast.success("Module added"); load();
  };
  const delModule = async (mid) => { if (!window.confirm("Delete module + all lessons?")) return;
    await api.delete(`/admin/modules/${mid}`); toast.success("Deleted"); load(); };
  const delLesson = async (lid) => { if (!window.confirm("Delete lesson?")) return;
    await api.delete(`/admin/lessons/${lid}`); toast.success("Deleted"); load(); };

  return (
    <div className="space-y-6" data-testid="course-editor">
      <Link to="/admin/courses" className="text-xs font-mono uppercase tracking-widest text-slate-500 hover:text-[#E11D48] flex items-center gap-1"><ArrowLeft className="w-3 h-3" /> Back to courses</Link>
      <div>
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#E11D48]">{data.course.category}</div>
        <h1 className="font-heading text-3xl font-bold mt-1">{data.course.title}</h1>
        <p className="text-slate-500 text-sm mt-1">{data.course.description}</p>
      </div>

      <div className="space-y-5">
        {data.modules.map((m, mi) => (
          <div key={m.id} className="hg-card overflow-hidden" data-testid={`editor-module-${m.id}`}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-500">Module {mi+1}</div>
                <div className="font-heading font-semibold">{m.title}</div>
              </div>
              <div className="flex gap-2">
                <button data-testid={`add-lesson-${m.id}`} onClick={()=>setAddingLessonFor(m.id)} className="text-xs px-3 py-1.5 border border-slate-300 rounded hover:bg-white flex items-center gap-1"><Plus className="w-3 h-3" /> Add lesson</button>
                <button data-testid={`del-module-${m.id}`} onClick={()=>delModule(m.id)} className="text-xs p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {m.lessons.map(l => (
                <div key={l.id} className="p-3 flex items-center gap-3" data-testid={`editor-lesson-${l.id}`}>
                  <div className="text-[10px] font-mono uppercase text-slate-500 bg-slate-100 px-2 py-1 rounded">{l.content_type}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{l.title}</div>
                    <div className="text-xs text-slate-500 truncate">{l.content_url || (l.text_content && l.text_content.slice(0,60)) || "—"}</div>
                  </div>
                  <span className="text-xs font-mono text-slate-500">{l.duration_min}m</span>
                  <button onClick={()=>setEditingLesson(l)} className="p-1.5 hover:bg-slate-100 rounded"><Pencil className="w-3.5 h-3.5" /></button>
                  <button data-testid={`del-lesson-${l.id}`} onClick={()=>delLesson(l.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              {m.lessons.length === 0 && <div className="p-4 text-center text-sm text-slate-500">No lessons yet.</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="hg-card p-4 flex gap-2">
        <input data-testid="new-module-title" value={newModuleTitle} onChange={(e)=>setNewModuleTitle(e.target.value)} placeholder="New module title" className="flex-1 px-3 py-2 border border-slate-300 rounded" />
        <button data-testid="add-module-btn" onClick={addModule} className="hg-btn-primary flex items-center gap-1"><Plus className="w-4 h-4" /> Add module</button>
      </div>

      {addingLessonFor && <LessonModal moduleId={addingLessonFor} onClose={()=>setAddingLessonFor(null)} onSaved={()=>{ setAddingLessonFor(null); load(); }} />}
      {editingLesson && <LessonModal lesson={editingLesson} onClose={()=>setEditingLesson(null)} onSaved={()=>{ setEditingLesson(null); load(); }} />}
    </div>
  );
}

function LessonModal({ moduleId, lesson, onClose, onSaved }) {
  const isEdit = !!lesson;
  const [f, setF] = useState({
    title: lesson?.title || "",
    content_type: lesson?.content_type || "youtube",
    content_url: lesson?.content_url || "",
    text_content: lesson?.text_content || "",
    duration_min: lesson?.duration_min || 10,
    order: lesson?.order || 0,
  });
  const [uploading, setUploading] = useState(false);

  const upload = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/upload", fd, { headers: {"Content-Type":"multipart/form-data"} });
      setF({ ...f, content_url: data.url });
      toast.success("Uploaded");
    } catch { toast.error("Upload failed"); } finally { setUploading(false); }
  };

  const save = async () => {
    if (!f.title.trim()) return toast.error("Title required");
    try {
      if (isEdit) await api.patch(`/admin/lessons/${lesson.id}`, f);
      else await api.post("/admin/lessons", { module_id: moduleId, ...f });
      toast.success(isEdit ? "Updated" : "Added");
      onSaved();
    } catch { toast.error("Save failed"); }
  };

  const needsFile = ["video","pdf","ppt","doc"].includes(f.content_type);
  const needsUrl = ["youtube","link"].includes(f.content_type);
  const needsText = f.content_type === "notes";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-lg w-full" onClick={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-xl font-bold">{isEdit ? "Edit lesson" : "Add lesson"}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <input data-testid="lesson-title" value={f.title} onChange={(e)=>setF({...f, title:e.target.value})} placeholder="Lesson title" className="w-full px-3 py-2 border border-slate-300 rounded" />
          <select data-testid="lesson-type" value={f.content_type} onChange={(e)=>setF({...f, content_type:e.target.value, content_url:"", text_content:""})} className="w-full px-3 py-2 border border-slate-300 rounded">
            {CONTENT_TYPES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
          </select>
          {needsFile && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Upload file</label>
              <input data-testid="lesson-file" type="file" onChange={(e)=>e.target.files[0] && upload(e.target.files[0])} className="text-sm" />
              {uploading && <div className="text-xs text-slate-500 mt-1">Uploading…</div>}
              {f.content_url && <div className="text-xs text-[#10B981] mt-1 font-mono">✓ {f.content_url}</div>}
            </div>
          )}
          {needsUrl && (
            <input data-testid="lesson-url" value={f.content_url} onChange={(e)=>setF({...f, content_url:e.target.value})} placeholder={f.content_type==="youtube"?"https://youtube.com/watch?v=...":"https://..."} className="w-full px-3 py-2 border border-slate-300 rounded" />
          )}
          {needsText && (
            <textarea data-testid="lesson-text" value={f.text_content} onChange={(e)=>setF({...f, text_content:e.target.value})} rows={6} placeholder="Lesson notes (text content)..." className="w-full px-3 py-2 border border-slate-300 rounded" />
          )}
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={f.duration_min} onChange={(e)=>setF({...f, duration_min:Number(e.target.value)})} placeholder="Duration (min)" className="px-3 py-2 border border-slate-300 rounded" />
            <input type="number" value={f.order} onChange={(e)=>setF({...f, order:Number(e.target.value)})} placeholder="Order" className="px-3 py-2 border border-slate-300 rounded" />
          </div>
        </div>
        <button data-testid="save-lesson-btn" onClick={save} className="hg-btn-primary w-full mt-4 flex items-center justify-center gap-2"><Save className="w-4 h-4" /> {isEdit ? "Update lesson" : "Add lesson"}</button>
      </div>
    </div>
  );
}
