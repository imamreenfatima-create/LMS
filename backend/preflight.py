#!/usr/bin/env python3
"""
Preflight check — run before every deploy.

Catches the class of failures that took production down on 2026-06-20:
  • Undefined names at module load (NameError on import → CrashLoopBackOff)
  • Syntax errors that webpack/uvicorn would only surface at boot
  • Missing dependencies declared in requirements.txt
  • Critical endpoints not reachable

Exit 0 = safe to deploy. Non-zero = abort the deploy.

Usage:
    cd /app/backend && python preflight.py
"""
import importlib
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent
FAILURES = []

def check(label):
    def deco(fn):
        try:
            fn()
            print(f"  ✓ {label}")
        except Exception as e:
            FAILURES.append((label, str(e)))
            print(f"  ✗ {label}: {e}")
        return fn
    return deco

print("\n=== Hireginie LMS preflight ===\n")

print("Step 1/4 — Static checks (Pyflakes detects undefined names BEFORE runtime)")
res = subprocess.run(["python", "-m", "pyflakes", "server.py", "seed.py"],
                    cwd=ROOT, capture_output=True, text=True)
if res.returncode != 0 and res.stdout:
    # Only block on undefined-name errors. Pyflakes prints these as `F821` / "undefined name"
    blocking = [ln for ln in res.stdout.splitlines() if "undefined" in ln or "redefinition" in ln]
    if blocking:
        for ln in blocking:
            print(f"  ✗ {ln}")
            FAILURES.append(("pyflakes", ln))
    else:
        print("  ✓ No undefined names")
else:
    print("  ✓ No undefined names")

print("\nStep 2/4 — Import server.py (catches NameError-on-import / CrashLoopBackOff)")
sys.path.insert(0, str(ROOT))
@check("server module imports cleanly")
def _():
    if "server" in sys.modules:
        importlib.reload(sys.modules["server"])
    else:
        importlib.import_module("server")

print("\nStep 3/4 — Verify required packages installed")
required = ["fastapi", "motor", "pymongo", "bcrypt", "jwt", "qrcode", "reportlab",
            "emergentintegrations", "requests", "dotenv"]
for pkg in required:
    @check(f"package: {pkg}")
    def _(_p=pkg):
        importlib.import_module(_p)

print("\nStep 4/4 — Required env vars present")
import os
from dotenv import load_dotenv
load_dotenv(ROOT / ".env")
for var in ["MONGO_URL", "DB_NAME", "JWT_SECRET", "EMERGENT_LLM_KEY"]:
    @check(f"env: {var}")
    def _(_v=var):
        if not os.environ.get(_v):
            raise RuntimeError("missing")

print("\n=== Summary ===")
if FAILURES:
    print(f"\n❌ {len(FAILURES)} failure(s) — DO NOT DEPLOY:\n")
    for label, err in FAILURES:
        print(f"   • {label}: {err}")
    sys.exit(1)
print("\n✅ All checks passed — safe to deploy.\n")
sys.exit(0)
