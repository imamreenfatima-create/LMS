import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { UserPlus, Upload, KeyRound, X } from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name:"", email:"", role:"learner", department:"", designation:"", mobile:"" });
  const [filter, setFilter] = useState("all");

  const load = () => api.get("/admin/users").then(r => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/admin/users", form);
      toast.success(`Created ${data.user.login_id} · default password: ${data.default_password}`);
      setOpen(false); setForm({ full_name:"", email:"", role:"learner", department:"", designation:"", mobile:"" });
      load();
    } catch (err) { toast.error(err?.response?.data?.detail || "Failed"); }
  };

  const reset = async (id) => {
    const { data } = await api.post(`/admin/users/${id}/reset-password`);
    toast.success(`Password reset to: ${data.new_password}`);
  };

  const updateStatus = async (id, status) => {
    await api.patch(`/admin/users/${id}`, { status }); toast.success("Status updated"); load();
  };

  const upload = async (file) => {
    const fd = new FormData(); fd.append("file", file);
    try {
      const { data } = await api.post("/admin/users/bulk-upload", fd, { headers: { "Content-Type": "multipart/form-data" }});
      toast.success(`Created ${data.created.length} user(s), ${data.errors.length} error(s)`);
      load();
    } catch { toast.error("Upload failed"); }
  };

  const filtered = filter === "all" ? users : users.filter(u => u.role === filter);

  return (
    <div className="space-y-6" data-testid="admin-users">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500">User management</div>
          <h1 className="font-heading text-4xl font-bold mt-1">Users</h1>
        </div>
        <div className="flex gap-2">
          <label className="px-4 py-2 border border-slate-300 rounded-sm text-sm hover:bg-slate-50 cursor-pointer flex items-center gap-2">
            <Upload className="w-4 h-4" /> Bulk CSV
            <input data-testid="bulk-upload-input" type="file" accept=".csv" className="hidden" onChange={(e)=>e.target.files[0] && upload(e.target.files[0])} />
          </label>
          <button data-testid="add-user-btn" onClick={()=>setOpen(true)} className="hg-btn-primary flex items-center gap-2"><UserPlus className="w-4 h-4" /> Add user</button>
        </div>
      </div>

      <div className="flex gap-2">
        {["all","admin","trainer","learner"].map(r => (
          <button key={r} onClick={()=>setFilter(r)} data-testid={`user-filter-${r}`} className={`px-3 py-1.5 text-xs uppercase tracking-wider rounded ${filter===r ? "bg-[#0B1121] text-white" : "bg-white border border-slate-300"}`}>{r}</button>
        ))}
      </div>

      <div className="hg-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-[10px] font-mono uppercase tracking-widest text-slate-500">
              <th className="p-3">Login ID</th><th className="p-3">Name</th><th className="p-3">Role</th>
              <th className="p-3">Department</th><th className="p-3">Status</th><th className="p-3">Points</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filtered.map(u => (
              <tr key={u.id} data-testid={`user-row-${u.login_id}`}>
                <td className="p-3 font-mono font-semibold">{u.login_id}</td>
                <td className="p-3">{u.full_name}<div className="text-xs text-slate-500">{u.email}</div></td>
                <td className="p-3"><span className="px-2 py-0.5 text-xs rounded bg-slate-100">{u.role}</span></td>
                <td className="p-3 text-slate-600">{u.department || "—"}</td>
                <td className="p-3"><span className={`text-xs font-mono uppercase ${u.status==='active'?'text-[#10B981]':'text-slate-500'}`}>{u.status}</span></td>
                <td className="p-3 font-mono">{u.points || 0}</td>
                <td className="p-3 text-right">
                  <button data-testid={`reset-${u.login_id}`} onClick={()=>reset(u.id)} title="Reset password" className="p-1.5 hover:bg-slate-100 rounded"><KeyRound className="w-3.5 h-3.5" /></button>
                  <button data-testid={`toggle-status-${u.login_id}`} onClick={()=>updateStatus(u.id, u.status==='active'?'inactive':'active')} className="ml-1 text-xs px-2 py-1 border border-slate-300 rounded hover:bg-slate-50">
                    {u.status==='active' ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={()=>setOpen(false)}>
          <form onSubmit={create} className="bg-white rounded-lg p-6 max-w-lg w-full" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-xl font-bold">Add user</h2>
              <button type="button" onClick={()=>setOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input data-testid="new-user-name" value={form.full_name} onChange={(e)=>setForm({...form, full_name:e.target.value})} placeholder="Full name (optional — employee can set on first login)" className="w-full px-3 py-2 border border-slate-300 rounded" />
              <input data-testid="new-user-email" type="email" value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} placeholder="Email (optional)" className="w-full px-3 py-2 border border-slate-300 rounded" />
              <select data-testid="new-user-role" value={form.role} onChange={(e)=>setForm({...form, role:e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded">
                <option value="learner">Learner</option>
                <option value="trainer">Trainer</option>
                <option value="admin">Super Admin</option>
              </select>
              <input value={form.department} onChange={(e)=>setForm({...form, department:e.target.value})} placeholder="Department (optional)" className="w-full px-3 py-2 border border-slate-300 rounded" />
              <input value={form.designation} onChange={(e)=>setForm({...form, designation:e.target.value})} placeholder="Designation (optional)" className="w-full px-3 py-2 border border-slate-300 rounded" />
              <input value={form.mobile} onChange={(e)=>setForm({...form, mobile:e.target.value})} placeholder="Mobile (optional)" className="w-full px-3 py-2 border border-slate-300 rounded" />
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-200">
                All fields are optional — the employee can complete their profile on first login.<br/>
                Login ID is auto-generated (AD1001–AD1500 for admin/trainer, 1001–1500 for learner). Default password: <span className="font-mono">Welcome@123</span>
              </div>
            </div>
            <button data-testid="create-user-submit" type="submit" className="hg-btn-primary w-full mt-4">Create user</button>
          </form>
        </div>
      )}
    </div>
  );
}
