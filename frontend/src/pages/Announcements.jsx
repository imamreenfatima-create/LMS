import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";
import { Megaphone, Plus, X, Pin, Trash2, Pencil, Trophy, GraduationCap, Wrench } from "lucide-react";

const CATEGORY_META = {
  general: { label: "General", icon: Megaphone, color: "bg-slate-100 text-slate-700" },
  recognition: { label: "Recognition", icon: Trophy, color: "bg-amber-100 text-amber-800" },
  course_launch: { label: "Course Launch", icon: GraduationCap, color: "bg-emerald-100 text-emerald-800" },
  maintenance: { label: "Maintenance", icon: Wrench, color: "bg-blue-100 text-blue-800" },
};

export default function Announcements() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "trainer";
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", body: "", pinned: false, audience: "all", category: "general", department: "" });

  const load = () => api.get("/announcements").then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return toast.error("Title and body required");
    try {
      if (editing) {
        await api.patch(`/admin/announcements/${editing.id}`, form);
        toast.success("Announcement updated");
      } else {
        await api.post("/admin/announcements", form);
        toast.success("Announcement published");
      }
      setOpen(false); setEditing(null);
      setForm({ title: "", body: "", pinned: false, audience: "all", category: "general", department: "" });
      load();
    } catch (err) { toast.error(err?.response?.data?.detail || "Failed"); }
  };

  const startEdit = (a) => {
    setEditing(a);
    setForm({ title: a.title, body: a.body, pinned: !!a.pinned, audience: a.audience || "all", category: a.category || "general", department: a.department || "" });
    setOpen(true);
  };

  const remove = async (id) => {
    if (!confirm("Delete this announcement?")) return;
    await api.delete(`/admin/announcements/${id}`);
    toast.success("Deleted"); load();
  };

  return (
    <div className="space-y-6" data-testid="announcements-page">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500">Updates</div>
          <h1 className="font-heading text-4xl font-bold mt-1">Announcements</h1>
          <p className="text-slate-600 mt-2">Stay informed about course launches, recognitions, and platform updates.</p>
        </div>
        {isAdmin && (
          <button data-testid="new-announcement-btn" onClick={() => { setEditing(null); setOpen(true); }} className="hg-btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New announcement
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="hg-card p-12 text-center">
          <Megaphone className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <div className="text-slate-500">No announcements yet.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(a => {
            const meta = CATEGORY_META[a.category] || CATEGORY_META.general;
            const Icon = meta.icon;
            return (
              <article key={a.id} data-testid={`announcement-${a.id}`} className={`hg-card p-5 ${a.pinned ? "border-l-4 border-l-[#E11D48]" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {a.pinned && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-[#E11D48]"><Pin className="w-3 h-3" /> Pinned</span>
                      )}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${meta.color}`}>
                        <Icon className="w-3 h-3" /> {meta.label}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{new Date(a.ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                    <h3 className="font-heading text-xl font-semibold text-slate-900">{a.title}</h3>
                    <p className="text-slate-700 mt-2 whitespace-pre-line">{a.body}</p>
                    <div className="text-[11px] text-slate-500 mt-3">— {a.author_name}</div>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-col gap-2">
                      <button onClick={() => startEdit(a)} className="text-slate-400 hover:text-slate-700" data-testid={`edit-ann-${a.id}`}><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => remove(a.id)} className="text-slate-400 hover:text-rose-600" data-testid={`del-ann-${a.id}`}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {open && isAdmin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="ann-modal">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-heading text-xl font-semibold">{editing ? "Edit announcement" : "New announcement"}</h3>
              <button onClick={() => { setOpen(false); setEditing(null); }} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submit} className="p-5 space-y-4">
              <input data-testid="ann-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full px-3 py-2 border border-slate-300 rounded-md" />
              <textarea data-testid="ann-body" required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Write your announcement…" rows={6} className="w-full px-3 py-2 border border-slate-300 rounded-md" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-md">
                    {Object.entries(CATEGORY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Audience</label>
                  <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-md">
                    <option value="all">Everyone</option>
                    <option value="learners">Learners only</option>
                    <option value="admins">Admins only</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input data-testid="ann-pinned" type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
                Pin to top
              </label>
              <button data-testid="ann-submit" type="submit" className="w-full hg-btn-primary py-2.5">{editing ? "Update" : "Publish"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
