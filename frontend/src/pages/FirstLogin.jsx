import React, { useState } from "react";
import { useAuth } from "../lib/auth";
import { api, LOGO_URL } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, User2, Loader2 } from "lucide-react";

export default function FirstLogin() {
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    mobile: user?.mobile || "",
    department: user?.department || "",
    designation: user?.designation || "",
    new_password: "",
    confirm: "",
  });
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user) { nav("/login"); return null; }
  if (!user.must_change_password) {
    nav(user.role === "learner" ? "/app/dashboard" : "/admin/dashboard");
    return null;
  }

  const update = (k, v) => setForm({ ...form, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) return toast.error("Please enter your full name");
    if (form.new_password.length < 8) return toast.error("Password must be at least 8 characters");
    if (form.new_password !== form.confirm) return toast.error("Passwords don't match");
    if (!accept) return toast.error("Please accept the learning policy");
    setBusy(true);
    try {
      await api.post("/auth/complete-profile", {
        full_name: form.full_name.trim(),
        email: form.email || null,
        mobile: form.mobile,
        department: form.department,
        designation: form.designation,
        new_password: form.new_password,
        accept_policy: true,
      });
      await refresh();
      toast.success(`Welcome to Hireginie, ${form.full_name.split(" ")[0]}!`);
      nav(user.role === "learner" ? "/app/dashboard" : "/admin/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to complete profile");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[#F8FAFC]" data-testid="first-login-page">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-lg p-8 hg-fade">
        <div className="flex items-center gap-3 mb-6">
          <img src={LOGO_URL} alt="" className="w-10 h-10" />
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500">Welcome aboard</div>
            <div className="font-heading text-2xl font-bold flex items-center gap-2"><User2 className="w-5 h-5 text-[#E11D48]" /> Complete your profile</div>
          </div>
        </div>
        <p className="text-slate-600 text-sm mb-6">
          You're logged in as <span className="font-mono font-semibold text-slate-900">{user.login_id}</span>. Please tell us a bit about yourself and set a secure password to continue.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Full name *</label>
            <input data-testid="fl-name" required autoFocus value={form.full_name} onChange={(e)=>update("full_name", e.target.value)} placeholder="e.g. Priya Sharma" className="w-full px-4 py-2.5 border border-slate-300 rounded" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Email</label>
              <input data-testid="fl-email" type="email" value={form.email} onChange={(e)=>update("email", e.target.value)} placeholder="you@hireginie.com" className="w-full px-4 py-2.5 border border-slate-300 rounded" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Mobile</label>
              <input data-testid="fl-mobile" value={form.mobile} onChange={(e)=>update("mobile", e.target.value)} placeholder="+91 ..." className="w-full px-4 py-2.5 border border-slate-300 rounded" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Department</label>
              <input data-testid="fl-dept" value={form.department} onChange={(e)=>update("department", e.target.value)} placeholder="e.g. Technical Recruitment" className="w-full px-4 py-2.5 border border-slate-300 rounded" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Designation</label>
              <input data-testid="fl-desig" value={form.designation} onChange={(e)=>update("designation", e.target.value)} placeholder="e.g. Tech Recruiter" className="w-full px-4 py-2.5 border border-slate-300 rounded" />
            </div>
          </div>
          <div className="pt-4 border-t border-slate-200 grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">New password *</label>
              <input data-testid="fl-pw" required type="password" value={form.new_password} onChange={(e)=>update("new_password", e.target.value)} placeholder="Min 8 characters" className="w-full px-4 py-2.5 border border-slate-300 rounded" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Confirm password *</label>
              <input data-testid="fl-pw2" required type="password" value={form.confirm} onChange={(e)=>update("confirm", e.target.value)} placeholder="Re-enter password" className="w-full px-4 py-2.5 border border-slate-300 rounded" />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-200">
            <input data-testid="fl-accept" type="checkbox" checked={accept} onChange={(e)=>setAccept(e.target.checked)} className="mt-1" />
            <span>I accept the Hireginie Learning Policy and commit to completing my assigned training in good faith.</span>
          </label>
          <button data-testid="fl-submit" disabled={busy} className="hg-btn-primary w-full py-3 flex items-center justify-center gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save & continue to dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
