import React, { useState } from "react";
import { useAuth } from "../lib/auth";
import { useNavigate, Navigate } from "react-router-dom";
import { LOGO_URL } from "../lib/api";
import { toast, Toaster } from "sonner";
import { Loader2, ShieldCheck, Sparkles } from "lucide-react";

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [loginId, setLoginId] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={user.role === "learner" ? "/app/dashboard" : "/admin/dashboard"} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(loginId.trim(), pw);
      toast.success(`Welcome, ${u.full_name}`);
      if (u.must_change_password) nav("/first-login");
      else nav(u.role === "learner" ? "/app/dashboard" : "/admin/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      <Toaster position="top-right" richColors />
      {/* Left: brand panel */}
      <div className="hidden lg:flex lg:w-1/2 hg-sidebar relative overflow-hidden">
        <div className="absolute inset-0 hg-grain opacity-50" />
        <div className="relative z-10 p-12 flex flex-col justify-between w-full">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Hireginie" className="w-10 h-10 rounded-sm" />
            <div className="text-white font-heading text-2xl font-bold tracking-tight">Hireginie<span className="text-[#E11D48]">.</span></div>
          </div>
          <div className="space-y-6 max-w-md">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#94A3B8]">Enterprise LMS · Recruitment Training</div>
            <h1 className="font-heading text-white text-5xl font-bold leading-[1.05]">
              Build the<br/>recruitment<br/>workforce of<br/>tomorrow.
            </h1>
            <p className="text-[#CBD5E1] text-base leading-relaxed">
              A purpose-built learning platform for recruiters, TA specialists, and HR teams.
              Six learning domains, AI-powered training, and verifiable certifications.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#1E293B]">
              <div>
                <div className="text-3xl font-heading font-bold text-white">17+</div>
                <div className="text-xs text-[#94A3B8] uppercase tracking-wider mt-1">Curated Courses</div>
              </div>
              <div>
                <div className="text-3xl font-heading font-bold text-white">6</div>
                <div className="text-xs text-[#94A3B8] uppercase tracking-wider mt-1">Domains</div>
              </div>
            </div>
          </div>
          <div className="text-xs text-[#64748B] font-mono">© 2026 Hireginie. All rights reserved.</div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F8FAFC]">
        <div className="w-full max-w-md hg-fade">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src={LOGO_URL} alt="Hireginie" className="w-10 h-10 rounded-sm" />
            <div className="font-heading text-2xl font-bold">Hireginie<span className="text-[#E11D48]">.</span></div>
          </div>
          <div className="mb-8">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500 mb-3">Sign in</div>
            <h2 className="font-heading text-3xl font-bold text-slate-900">Access your learning hub</h2>
            <p className="text-slate-500 mt-2 text-sm">Use your Admin ID (AD1001–AD1500) or Employee Code (1001–1500).</p>
          </div>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Login ID</label>
              <input
                data-testid="login-id-input"
                autoFocus
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="e.g. AD1001 or 1001"
                className="w-full px-4 py-3 border border-slate-300 rounded-md font-mono text-base focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Password</label>
              <input
                data-testid="login-password-input"
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-slate-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-[#E11D48] focus:border-transparent"
                required
              />
            </div>
            <button
              data-testid="login-submit-btn"
              type="submit"
              disabled={busy}
              className="w-full hg-btn-primary text-base py-3 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Sign in securely
            </button>
            <div className="border-t border-slate-200 pt-5 text-xs text-slate-500 space-y-2">
              <div className="flex items-center gap-2 text-slate-600"><Sparkles className="w-3.5 h-3.5 text-[#E11D48]" /> Demo accounts</div>
              <div className="font-mono space-y-1">
                <div><span className="text-slate-900 font-semibold">AD1001</span> · Welcome@123 (Super Admin)</div>
                <div><span className="text-slate-900 font-semibold">1001</span> · Welcome@123 (Learner)</div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
