import React, { useEffect, useState } from "react";
import { api, CATEGORIES } from "../lib/api";
import { toast } from "sonner";
import { Plus, X, Send, Sparkles, Pencil } from "lucide-react";

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(null);
  const [form, setForm] = useState({ title:"", description:"", category:CATEGORIES[0], level:"Beginner", duration_hours:3, thumbnail:"https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&q=80", is_published:true, skills:[] });

  const load = () => api.get("/courses").then(r => setCourses(r.data));
  useEffect(() => { load(); api.get("/admin/users").then(r => setUsers(r.data.filter(u => u.role==='learner'))); }, []);

  const create = async (e) => {
    e.preventDefault();
    await api.post("/admin/courses", form);
    toast.success("Course created");
    setOpen(false);
    setForm({ ...form, title:"", description:"" });
    load();
  };

  const assign = async (courseId, userIds) => {
    await api.post("/admin/courses/assign", { course_ids: [courseId], user_ids: userIds });
    toast.success(`Assigned to ${userIds.length} learner(s)`);
    setAssignOpen(null);
  };

  return (
    <div className="space-y-6" data-testid="admin-courses">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500">Content management</div>
          <h1 className="font-heading text-4xl font-bold mt-1">Courses</h1>
        </div>
        <button data-testid="add-course-btn" onClick={()=>setOpen(true)} className="hg-btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> New course</button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.map(c => (
          <div key={c.id} className="hg-card overflow-hidden" data-testid={`admin-course-${c.id}`}>
            <div className="h-32 bg-slate-100"><img src={c.thumbnail} alt="" className="w-full h-full object-cover" /></div>
            <div className="p-4">
              <div className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">{c.category}</div>
              <div className="font-heading font-semibold mt-1">{c.title}</div>
              <div className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description}</div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                <span className="text-xs font-mono text-slate-500">{c.module_count} modules</span>
                <div className="flex gap-2">
                  <a href={`/admin/course/${c.id}/edit`} data-testid={`edit-${c.id}`} className="text-xs text-slate-600 flex items-center gap-1"><Pencil className="w-3 h-3" /> Manage</a>
                  <button data-testid={`assign-${c.id}`} onClick={()=>setAssignOpen(c)} className="text-xs text-[#E11D48] flex items-center gap-1"><Send className="w-3 h-3" /> Assign</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={()=>setOpen(false)}>
          <form onSubmit={create} className="bg-white rounded-lg p-6 max-w-xl w-full" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl font-bold">New course</h2>
              <button type="button" onClick={()=>setOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input data-testid="course-title" required value={form.title} onChange={(e)=>setForm({...form, title:e.target.value})} placeholder="Course title" className="w-full px-3 py-2 border border-slate-300 rounded" />
              <textarea data-testid="course-desc" value={form.description} onChange={(e)=>setForm({...form, description:e.target.value})} placeholder="Description" rows={3} className="w-full px-3 py-2 border border-slate-300 rounded" />
              <div className="grid grid-cols-2 gap-3">
                <select data-testid="course-category" value={form.category} onChange={(e)=>setForm({...form, category:e.target.value})} className="px-3 py-2 border border-slate-300 rounded">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <select value={form.level} onChange={(e)=>setForm({...form, level:e.target.value})} className="px-3 py-2 border border-slate-300 rounded">
                  <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                </select>
              </div>
              <input type="number" value={form.duration_hours} onChange={(e)=>setForm({...form, duration_hours:Number(e.target.value)})} placeholder="Duration (hours)" className="w-full px-3 py-2 border border-slate-300 rounded" />
              <input value={form.thumbnail} onChange={(e)=>setForm({...form, thumbnail:e.target.value})} placeholder="Thumbnail URL" className="w-full px-3 py-2 border border-slate-300 rounded text-sm" />
            </div>
            <button data-testid="create-course-submit" type="submit" className="hg-btn-primary w-full mt-4">Create course</button>
          </form>
        </div>
      )}

      {assignOpen && <AssignModal course={assignOpen} users={users} onClose={()=>setAssignOpen(null)} onAssign={assign} />}
    </div>
  );
}

function AssignModal({ course, users, onClose, onAssign }) {
  const [sel, setSel] = useState([]);
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[80vh] flex flex-col" onClick={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div><h2 className="font-heading text-xl font-bold">Assign course</h2><div className="text-sm text-slate-500">{course.title}</div></div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 border border-slate-200 rounded">
          {users.map(u => (
            <label key={u.id} className="flex items-center gap-2 p-2 border-b border-slate-100 cursor-pointer hover:bg-slate-50">
              <input data-testid={`assign-user-${u.login_id}`} type="checkbox" checked={sel.includes(u.id)} onChange={()=>setSel(sel.includes(u.id) ? sel.filter(x=>x!==u.id) : [...sel, u.id])} />
              <span className="font-mono text-sm">{u.login_id}</span>
              <span className="text-sm">{u.full_name}</span>
              <span className="text-xs text-slate-500 ml-auto">{u.department}</span>
            </label>
          ))}
        </div>
        <button data-testid="confirm-assign-btn" disabled={sel.length===0} onClick={()=>onAssign(course.id, sel)} className="hg-btn-primary mt-4">Assign to {sel.length} learner(s)</button>
      </div>
    </div>
  );
}
