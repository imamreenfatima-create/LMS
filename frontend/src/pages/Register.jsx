import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, LOGO_URL } from "../lib/api";
import { useAuth } from "../lib/auth";
import { toast, Toaster } from "sonner";
import { Loader2, UserPlus } from "lucide-react";

export default function Register() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [f, setF] = useState({ full_name: "", employee_code: "", password: "", confirm: "", email: "", department: "", designation: "" });
  const [busy, setBusy] = useState(false);
  const update = (k, v) => setF({ ...f, [k]: v });

  const submit = async (e) => {
    e.preventDefault();
    if (!f.full_name.trim()) return toast.error("Full name is required");
    if (!/^(AD\d{4}|\d{4})$/i.test(f.employee_code.trim())) return toast.error("Use 4-digit code (e.g. 1001) for learner, or AD + 4-digit (e.g. AD1001) for admin");
    if (f.password.length < 8) return toast.error("Password must be at least 8 characters");
    if (f.password !== f.confirm) return toast.error("Passwords don't match");
    setBusy(true);
    try {
      await api.post("/auth/register", {
        full_name: f.full_name.trim(),
        employee_code: f.employee_code.trim().toUpperCase(),
        password: f.password,
        email: f.email || null,
        department: f.department,
        designation: f.designation,
      });
      toast.success("Account created! Signing you in…");
      const user = await login(f.employee_code.trim().toUpperCase(), f.password);
      nav(user.role === "learner" ? "/app/dashboard" : "/admin/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex" data-testid="register-page">
      <Toaster position="top-right" richColors />
      <div className="hidden lg:flex lg:w-1/2 hg-sidebar relative overflow-hidden">
        <div className="absolute inset-0 hg-grain opacity-50" />
        <div className="relative z-10 p-12 flex flex-col justify-between w-full">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="" className="w-10 h-10 rounded-sm" />
            <div className="text-white font-heading text-2xl font-bold tracking-tight">HIREGINIE</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#94A3B8] -mt-0.5">Talent Cloud</div>
          </div>
          <div className="space-y-6 max-w-md">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#94A3B8]">Join the platform</div>
            <h1 className="font-heading text-white text-5xl font-bold leading-[1.05]">Create your<br/>learner account<br/>in 30 seconds.</h1>
            <p className="text-[#CBD5E1] text-base leading-relaxed">
              Pick your employee code, set a password, and you're in. No approvals needed for the demo workspace.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#1E293B] text-sm">
              <div><div className="text-[#94A3B8] font-mono uppercase text-[10px] tracking-widest">Learner code</div><div className="text-white font-mono mt-1">1001 – 1500</div></div>
              <div><div className="text-[#94A3B8] font-mono uppercase text-[10px] tracking-widest">Admin code</div><div className="text-white font-mono mt-1">AD1001 – AD1500</div></div>
            </div>
          </div>
          <div className="text-xs text-[#64748B] font-mono">© 2026 Hireginie. All rights reserved.</div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-[#F8FAFC]">
        <div className="w-full max-w-md hg-fade">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src={LOGO_URL} alt="" className="w-10 h-10" />
            <div className="font-heading text-2xl font-bold tracking-tight">HIREGINIE</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 -mt-0.5">Talent Cloud</div>
          </div>
          <div className="mb-6">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500 mb-3">Sign up</div>
            <h2 className="font-heading text-3xl font-bold">Create your account</h2>
            <p className="text-slate-500 mt-2 text-sm">Already registered? <Link to="/login" className="text-[#E11D48] underline">Sign in</Link>.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Full name *</label>
              <input data-testid="reg-name" required autoFocus value={f.full_name} onChange={(e)=>update("full_name", e.target.value)} placeholder="e.g. Priya Sharma" className="w-full px-4 py-2.5 border border-slate-300 rounded-md" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Employee code *</label>
              <input data-testid="reg-code" required value={f.employee_code} onChange={(e)=>update("employee_code", e.target.value)} placeholder="1001 or AD1001" className="w-full px-4 py-2.5 border border-slate-300 rounded-md font-mono" />
              <div className="text-[11px] text-slate-500 mt-1">Learners: <span className="font-mono">1001–1500</span> · Admins: <span className="font-mono">AD1001–AD1500</span></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input data-testid="reg-pw" required type="password" value={f.password} onChange={(e)=>update("password", e.target.value)} placeholder="Password (min 8)" className="w-full px-4 py-2.5 border border-slate-300 rounded-md" />
              <input data-testid="reg-pw2" required type="password" value={f.confirm} onChange={(e)=>update("confirm", e.target.value)} placeholder="Confirm password" className="w-full px-4 py-2.5 border border-slate-300 rounded-md" />
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer text-slate-600 hover:text-slate-900 text-xs font-semibold uppercase tracking-wider">Optional details</summary>
              <div className="mt-3 space-y-3">
                <input data-testid="reg-email" type="email" value={f.email} onChange={(e)=>update("email", e.target.value)} placeholder="Email" className="w-full px-4 py-2.5 border border-slate-300 rounded-md" />
                <input value={f.department} onChange={(e)=>update("department", e.target.value)} placeholder="Department (e.g. Technical Recruitment)" className="w-full px-4 py-2.5 border border-slate-300 rounded-md" />
                <input value={f.designation} onChange={(e)=>update("designation", e.target.value)} placeholder="Designation (e.g. Tech Recruiter)" className="w-full px-4 py-2.5 border border-slate-300 rounded-md" />
              </div>
            </details>
            <button data-testid="reg-submit" type="submit" disabled={busy} className="w-full hg-btn-primary py-3 flex items-center justify-center gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Create account & sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
