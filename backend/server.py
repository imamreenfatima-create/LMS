"""Hireginie LMS - FastAPI backend."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, jwt, bcrypt, shutil, io, csv
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage
import qrcode
from reportlab.lib.pagesizes import landscape, A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from io import BytesIO

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = os.environ['JWT_ALGORITHM']
JWT_EXPIRE_MINUTES = int(os.environ['JWT_EXPIRE_MINUTES'])
EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']

app = FastAPI(title="Hireginie LMS")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ---------- Helpers ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def new_id() -> str:
    return str(uuid.uuid4())

def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def make_token(user_id: str, role: str, login_id: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "login_id": login_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    try:
        data = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": data["sub"]}, {"_id": 0, "password_hash": 0})
    if not user or user.get("status") != "active":
        raise HTTPException(401, "User not found or inactive")
    return user

def require_role(*roles: str):
    async def _dep(user=Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, f"Requires role: {roles}")
        return user
    return _dep

async def log_activity(user_id: str, action: str, meta: Optional[Dict] = None):
    await db.activity_logs.insert_one({
        "id": new_id(), "user_id": user_id, "action": action,
        "meta": meta or {}, "ts": now_iso()
    })

async def create_notification(user_id: str, title: str, body: str, kind: str = "info"):
    await db.notifications.insert_one({
        "id": new_id(), "user_id": user_id, "title": title, "body": body,
        "kind": kind, "read": False, "ts": now_iso()
    })

async def award_points(user_id: str, points: int, reason: str):
    await db.users.update_one({"id": user_id}, {"$inc": {"points": points}})
    await db.point_events.insert_one({
        "id": new_id(), "user_id": user_id, "points": points,
        "reason": reason, "ts": now_iso()
    })

# ---------- Models ----------
class LoginIn(BaseModel):
    login_id: str
    password: str

class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str
    accept_policy: bool = False

class UserCreateIn(BaseModel):
    full_name: Optional[str] = ""
    email: Optional[EmailStr] = None
    mobile: Optional[str] = ""
    department: Optional[str] = ""
    designation: Optional[str] = ""
    joining_date: Optional[str] = ""
    reporting_manager: Optional[str] = ""
    role: str = "learner"  # learner | trainer | admin
    password: Optional[str] = None  # optional, default Welcome@123

class ProfileCompleteIn(BaseModel):
    full_name: str
    email: Optional[EmailStr] = None
    mobile: Optional[str] = ""
    department: Optional[str] = ""
    designation: Optional[str] = ""
    new_password: str
    accept_policy: bool = True

class UserUpdateIn(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    mobile: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    reporting_manager: Optional[str] = None
    status: Optional[str] = None  # active | inactive | suspended

class DepartmentIn(BaseModel):
    name: str
    description: Optional[str] = ""

class CourseIn(BaseModel):
    title: str
    description: str = ""
    category: str  # one of the 6 domains
    sub_category: Optional[str] = ""
    thumbnail: Optional[str] = ""
    duration_hours: float = 0
    level: str = "Beginner"  # Beginner | Intermediate | Advanced
    skills: List[str] = []
    is_published: bool = True

class ModuleIn(BaseModel):
    course_id: str
    title: str
    description: str = ""
    order: int = 0

class LessonIn(BaseModel):
    module_id: str
    title: str
    content_type: str  # video | pdf | ppt | notes | youtube | link | doc
    content_url: str = ""
    text_content: str = ""
    duration_min: float = 0
    order: int = 0

class LessonUpdateIn(BaseModel):
    title: Optional[str] = None
    content_type: Optional[str] = None
    content_url: Optional[str] = None
    text_content: Optional[str] = None
    duration_min: Optional[float] = None
    order: Optional[int] = None

class ModuleUpdateIn(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None

class QuestionIn(BaseModel):
    text: str
    type: str = "single"  # single | multiple | truefalse | fill
    options: List[str] = []
    correct: List[str] = []  # for fill, list of accepted strings
    marks: int = 1

class QuizIn(BaseModel):
    course_id: str
    title: str
    description: str = ""
    duration_min: int = 10
    pass_percent: int = 60
    negative_mark: float = 0
    shuffle: bool = True
    questions: List[QuestionIn] = []

class QuizSubmitIn(BaseModel):
    quiz_id: str
    answers: Dict[str, List[str]]  # question_id -> selected
    time_taken_sec: int = 0

class AssignmentIn(BaseModel):
    course_id: str
    title: str
    description: str = ""
    instructions: str = ""
    due_date: Optional[str] = ""
    max_marks: int = 100

class AssignmentSubmitIn(BaseModel):
    assignment_id: str
    text_submission: str = ""
    file_url: str = ""

class AssignmentEvaluateIn(BaseModel):
    submission_id: str
    marks: int
    feedback: str = ""

class AssignCoursesIn(BaseModel):
    user_ids: List[str]
    course_ids: List[str]

class ProgressIn(BaseModel):
    lesson_id: str

class AiChatIn(BaseModel):
    message: str
    session_id: Optional[str] = None
    course_id: Optional[str] = None

class AiQuizGenIn(BaseModel):
    text: str
    num_questions: int = 5

class AiSummarizeIn(BaseModel):
    text: str

# ---------- ID generation ----------
async def next_admin_id() -> str:
    last = await db.users.find_one({"login_id": {"$regex": "^AD[0-9]{4}$"}}, sort=[("login_id", -1)])
    if not last:
        return "AD1001"
    n = int(last["login_id"][2:]) + 1
    if n > 1500:
        raise HTTPException(400, "Admin range exhausted (AD1001-AD1500)")
    return f"AD{n}"

async def next_employee_id() -> str:
    cfg = await db.config.find_one({"key": "employee_range"}) or {"start": 1001, "end": 1500}
    last = await db.users.find_one(
        {"login_id": {"$regex": "^[0-9]{4}$"}}, sort=[("login_id", -1)]
    )
    if not last:
        return str(cfg["start"])
    n = int(last["login_id"]) + 1
    if n > cfg["end"]:
        raise HTTPException(400, f"Employee range exhausted ({cfg['start']}-{cfg['end']}). Configure new range.")
    return str(n)

# ---------- Auth ----------
class RegisterIn(BaseModel):
    full_name: str
    employee_code: str  # admins use AD#### (4-digit), learners use 4-digit numeric
    password: str
    email: Optional[EmailStr] = None
    department: Optional[str] = ""
    designation: Optional[str] = ""

@api_router.post("/auth/register")
async def register(payload: RegisterIn):
    code = payload.employee_code.strip().upper()
    # Validation
    import re
    is_admin = bool(re.match(r"^AD\d{4}$", code))
    is_learner = bool(re.match(r"^\d{4}$", code))
    if not (is_admin or is_learner):
        raise HTTPException(400, "Employee code must be 4 digits (e.g. 1001) for learners or AD + 4 digits (e.g. AD1001) for admins")
    if is_learner:
        n = int(code)
        if n < 1001 or n > 1500:
            raise HTTPException(400, "Learner employee code must be between 1001 and 1500")
    if is_admin:
        n = int(code[2:])
        if n < 1001 or n > 1500:
            raise HTTPException(400, "Admin code must be between AD1001 and AD1500")
    if not payload.full_name.strip():
        raise HTTPException(400, "Full name is required")
    if len(payload.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    existing = await db.users.find_one({"login_id": code})
    if existing:
        raise HTTPException(400, f"Employee code {code} is already registered")
    doc = {
        "id": new_id(), "login_id": code, "full_name": payload.full_name.strip(),
        "email": payload.email or "", "mobile": "",
        "department": payload.department or "", "designation": payload.designation or "",
        "joining_date": "", "reporting_manager": "",
        "role": "admin" if is_admin else "learner",
        "password_hash": hash_pw(payload.password),
        "must_change_password": False, "policy_accepted": True,
        "status": "active", "points": 0, "badges": [], "assigned_courses": [],
        "created_at": now_iso(), "self_registered": True,
    }
    await db.users.insert_one(doc)
    await log_activity(doc["id"], "self_registered")
    doc.pop("password_hash", None); doc.pop("_id", None)
    return {"user": doc}

@api_router.post("/auth/login")
async def login(payload: LoginIn):
    user = await db.users.find_one({"login_id": payload.login_id})
    if not user or not verify_pw(payload.password, user["password_hash"]):
        raise HTTPException(401, "Invalid login ID or password")
    if user.get("status") != "active":
        raise HTTPException(403, f"Account is {user.get('status', 'inactive')}")
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_login": now_iso()}})
    await log_activity(user["id"], "login")
    # Daily login bonus
    today = datetime.now(timezone.utc).date().isoformat()
    if user.get("last_login_date") != today:
        await db.users.update_one({"id": user["id"]}, {"$set": {"last_login_date": today}})
        await award_points(user["id"], 5, "Daily login")
    token = make_token(user["id"], user["role"], user["login_id"])
    user.pop("password_hash", None); user.pop("_id", None)
    return {"token": token, "user": user}

@api_router.get("/auth/me")
async def me(user=Depends(current_user)):
    return user

@api_router.post("/auth/complete-profile")
async def complete_profile(payload: ProfileCompleteIn, user=Depends(current_user)):
    full = await db.users.find_one({"id": user["id"]})
    if len(payload.new_password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    if not payload.full_name.strip():
        raise HTTPException(400, "Full name is required")
    updates = {
        "full_name": payload.full_name.strip(),
        "mobile": payload.mobile or full.get("mobile", ""),
        "department": payload.department or full.get("department", ""),
        "designation": payload.designation or full.get("designation", ""),
        "password_hash": hash_pw(payload.new_password),
        "must_change_password": False,
        "policy_accepted": payload.accept_policy,
        "profile_completed_at": now_iso(),
    }
    if payload.email:
        updates["email"] = payload.email
    await db.users.update_one({"id": user["id"]}, {"$set": updates})
    await log_activity(user["id"], "profile_completed")
    return {"ok": True}

@api_router.post("/auth/change-password")
async def change_password(payload: ChangePasswordIn, user=Depends(current_user)):
    full = await db.users.find_one({"id": user["id"]})
    if not verify_pw(payload.current_password, full["password_hash"]):
        raise HTTPException(400, "Current password is incorrect")
    if len(payload.new_password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    await db.users.update_one({"id": user["id"]}, {"$set": {
        "password_hash": hash_pw(payload.new_password),
        "must_change_password": False,
        "policy_accepted": payload.accept_policy or full.get("policy_accepted", False),
    }})
    await log_activity(user["id"], "password_changed")
    return {"ok": True}

# ---------- Users (Admin) ----------
@api_router.post("/admin/users")
async def create_user(payload: UserCreateIn, user=Depends(require_role("admin"))):
    if payload.role == "admin":
        login_id = await next_admin_id()
    else:
        login_id = await next_employee_id()
    pw = payload.password or "Welcome@123"
    doc = {
        "id": new_id(), "login_id": login_id, "full_name": payload.full_name,
        "email": payload.email, "mobile": payload.mobile, "department": payload.department,
        "designation": payload.designation, "joining_date": payload.joining_date,
        "reporting_manager": payload.reporting_manager, "role": payload.role,
        "password_hash": hash_pw(pw), "must_change_password": True, "policy_accepted": False,
        "status": "active", "points": 0, "badges": [], "assigned_courses": [],
        "created_at": now_iso(), "last_login": None,
    }
    await db.users.insert_one(doc)
    await log_activity(user["id"], "user_created", {"login_id": login_id})
    doc.pop("password_hash", None); doc.pop("_id", None)
    return {"user": doc, "default_password": pw}

@api_router.get("/admin/users")
async def list_users(user=Depends(require_role("admin", "trainer"))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("login_id", 1).to_list(2000)
    return users

@api_router.patch("/admin/users/{user_id}")
async def update_user(user_id: str, payload: UserUpdateIn, user=Depends(require_role("admin"))):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"id": user_id}, {"$set": updates})
    return {"ok": True}

@api_router.post("/admin/users/{user_id}/reset-password")
async def reset_user_password(user_id: str, user=Depends(require_role("admin"))):
    new_pw = "Welcome@123"
    await db.users.update_one({"id": user_id}, {"$set": {
        "password_hash": hash_pw(new_pw), "must_change_password": True
    }})
    return {"ok": True, "new_password": new_pw}

@api_router.post("/admin/users/bulk-upload")
async def bulk_upload_users(file: UploadFile = File(...), user=Depends(require_role("admin"))):
    content = (await file.read()).decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))
    created, errors = [], []
    for row in reader:
        try:
            row = {k.strip().lower(): (v or "").strip() for k, v in row.items()}
            login_id = await next_employee_id()
            doc = {
                "id": new_id(), "login_id": login_id, "full_name": row.get("full_name", ""),
                "email": row.get("email", ""), "mobile": row.get("mobile", ""),
                "department": row.get("department", ""), "designation": row.get("designation", ""),
                "joining_date": row.get("joining_date", ""), "reporting_manager": row.get("reporting_manager", ""),
                "role": "learner", "password_hash": hash_pw("Welcome@123"),
                "must_change_password": True, "policy_accepted": False, "status": "active",
                "points": 0, "badges": [], "assigned_courses": [], "created_at": now_iso(),
            }
            await db.users.insert_one(doc)
            created.append({"login_id": login_id, "full_name": row.get("full_name", "")})
        except Exception as e:
            errors.append({"row": row, "error": str(e)})
    return {"created": created, "errors": errors}

# ---------- Departments ----------
@api_router.post("/admin/departments")
async def create_dept(payload: DepartmentIn, user=Depends(require_role("admin"))):
    doc = {"id": new_id(), **payload.model_dump(), "created_at": now_iso()}
    await db.departments.insert_one(doc); doc.pop("_id", None)
    return doc

@api_router.get("/admin/departments")
async def list_depts(user=Depends(current_user)):
    return await db.departments.find({}, {"_id": 0}).to_list(500)

# ---------- Courses ----------
@api_router.post("/admin/courses")
async def create_course(payload: CourseIn, user=Depends(require_role("admin", "trainer"))):
    doc = {"id": new_id(), **payload.model_dump(), "created_by": user["id"], "created_at": now_iso()}
    await db.courses.insert_one(doc); doc.pop("_id", None)
    return doc

@api_router.get("/courses")
async def list_courses(category: Optional[str] = None, user=Depends(current_user)):
    q = {"is_published": True}
    if category: q["category"] = category
    courses = await db.courses.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    # enrich with module count + assigned flag
    assigned = set(user.get("assigned_courses", []))
    for c in courses:
        c["is_assigned"] = c["id"] in assigned
        c["module_count"] = await db.modules.count_documents({"course_id": c["id"]})
    return courses

@api_router.get("/courses/{course_id}")
async def get_course(course_id: str, user=Depends(current_user)):
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course: raise HTTPException(404, "Course not found")
    modules = await db.modules.find({"course_id": course_id}, {"_id": 0}).sort("order", 1).to_list(200)
    for m in modules:
        m["lessons"] = await db.lessons.find({"module_id": m["id"]}, {"_id": 0}).sort("order", 1).to_list(200)
    quizzes = await db.quizzes.find({"course_id": course_id}, {"_id": 0, "questions.correct": 0}).to_list(50)
    assignments = await db.assignments.find({"course_id": course_id}, {"_id": 0}).to_list(50)
    progress = await db.progress.find({"user_id": user["id"], "course_id": course_id}, {"_id": 0}).to_list(2000)
    completed_lesson_ids = {p["lesson_id"] for p in progress}
    total_lessons = sum(len(m["lessons"]) for m in modules)
    pct = round((len(completed_lesson_ids) / total_lessons) * 100, 1) if total_lessons else 0
    return {
        "course": course, "modules": modules, "quizzes": quizzes, "assignments": assignments,
        "completed_lessons": list(completed_lesson_ids), "progress_pct": pct,
        "is_assigned": course_id in user.get("assigned_courses", []),
    }

@api_router.patch("/admin/courses/{course_id}")
async def update_course(course_id: str, payload: CourseIn, user=Depends(require_role("admin", "trainer"))):
    await db.courses.update_one({"id": course_id}, {"$set": payload.model_dump()})
    return {"ok": True}

@api_router.delete("/admin/courses/{course_id}")
async def delete_course(course_id: str, user=Depends(require_role("admin"))):
    await db.courses.delete_one({"id": course_id})
    await db.modules.delete_many({"course_id": course_id})
    return {"ok": True}

@api_router.post("/admin/courses/assign")
async def assign_courses(payload: AssignCoursesIn, user=Depends(require_role("admin", "trainer"))):
    for uid in payload.user_ids:
        await db.users.update_one({"id": uid}, {"$addToSet": {"assigned_courses": {"$each": payload.course_ids}}})
        for cid in payload.course_ids:
            c = await db.courses.find_one({"id": cid}, {"_id": 0, "title": 1})
            if c:
                await create_notification(uid, "New course assigned", f"You've been assigned: {c['title']}", "course")
    return {"ok": True}

# ---------- Modules / Lessons ----------
@api_router.post("/admin/modules")
async def create_module(payload: ModuleIn, user=Depends(require_role("admin", "trainer"))):
    doc = {"id": new_id(), **payload.model_dump(), "created_at": now_iso()}
    await db.modules.insert_one(doc); doc.pop("_id", None)
    return doc

@api_router.post("/admin/lessons")
async def create_lesson(payload: LessonIn, user=Depends(require_role("admin", "trainer"))):
    doc = {"id": new_id(), **payload.model_dump(), "created_at": now_iso()}
    await db.lessons.insert_one(doc); doc.pop("_id", None)
    return doc

@api_router.delete("/admin/modules/{module_id}")
async def del_module(module_id: str, user=Depends(require_role("admin", "trainer"))):
    await db.modules.delete_one({"id": module_id})
    await db.lessons.delete_many({"module_id": module_id})
    return {"ok": True}

@api_router.delete("/admin/lessons/{lesson_id}")
async def del_lesson(lesson_id: str, user=Depends(require_role("admin", "trainer"))):
    await db.lessons.delete_one({"id": lesson_id})
    return {"ok": True}

@api_router.patch("/admin/lessons/{lesson_id}")
async def update_lesson(lesson_id: str, payload: LessonUpdateIn, user=Depends(require_role("admin", "trainer"))):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        # Snapshot prior version
        prior = await db.lessons.find_one({"id": lesson_id}, {"_id": 0})
        if prior:
            content_keys = {"title","content_type","content_url","text_content","duration_min"}
            if any(k in updates for k in content_keys):
                version_count = await db.lesson_versions.count_documents({"lesson_id": lesson_id})
                await db.lesson_versions.insert_one({
                    "id": new_id(), "lesson_id": lesson_id,
                    "version": version_count + 1,
                    "snapshot": prior, "edited_by": user["id"],
                    "edited_by_name": user.get("full_name", ""),
                    "edited_at": now_iso(),
                })
        await db.lessons.update_one({"id": lesson_id}, {"$set": updates})
    return {"ok": True}

@api_router.get("/admin/lessons/{lesson_id}/versions")
async def lesson_versions(lesson_id: str, user=Depends(require_role("admin","trainer"))):
    versions = await db.lesson_versions.find({"lesson_id": lesson_id}, {"_id": 0}).sort("version", -1).to_list(50)
    return versions

@api_router.post("/admin/lessons/{lesson_id}/revert/{version}")
async def revert_lesson(lesson_id: str, version: int, user=Depends(require_role("admin","trainer"))):
    v = await db.lesson_versions.find_one({"lesson_id": lesson_id, "version": version}, {"_id": 0})
    if not v: raise HTTPException(404, "Version not found")
    snap = v["snapshot"]
    snap.pop("id", None); snap.pop("created_at", None)
    await db.lessons.update_one({"id": lesson_id}, {"$set": snap})
    return {"ok": True}

@api_router.patch("/admin/modules/{module_id}")
async def update_module(module_id: str, payload: ModuleUpdateIn, user=Depends(require_role("admin", "trainer"))):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.modules.update_one({"id": module_id}, {"$set": updates})
    return {"ok": True}

@api_router.get("/admin/courses/{course_id}/structure")
async def get_course_structure(course_id: str, user=Depends(require_role("admin", "trainer"))):
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course: raise HTTPException(404, "Course not found")
    modules = await db.modules.find({"course_id": course_id}, {"_id": 0}).sort("order", 1).to_list(200)
    for m in modules:
        m["lessons"] = await db.lessons.find({"module_id": m["id"]}, {"_id": 0}).sort("order", 1).to_list(200)
    return {"course": course, "modules": modules}

# ---------- Progress ----------
@api_router.post("/learner/progress")
async def mark_lesson_complete(payload: ProgressIn, user=Depends(current_user)):
    lesson = await db.lessons.find_one({"id": payload.lesson_id}, {"_id": 0})
    if not lesson: raise HTTPException(404, "Lesson not found")
    module = await db.modules.find_one({"id": lesson["module_id"]}, {"_id": 0})
    existing = await db.progress.find_one({"user_id": user["id"], "lesson_id": payload.lesson_id})
    if not existing:
        await db.progress.insert_one({
            "id": new_id(), "user_id": user["id"], "lesson_id": payload.lesson_id,
            "module_id": module["id"], "course_id": module["course_id"],
            "completed_at": now_iso(),
        })
        await award_points(user["id"], 10, "Lesson completed")
        await maybe_issue_certificate(user["id"], module["course_id"])
    return {"ok": True}

async def maybe_issue_certificate(user_id: str, course_id: str):
    modules = await db.modules.find({"course_id": course_id}).to_list(200)
    total_lessons = await db.lessons.count_documents({"module_id": {"$in": [m["id"] for m in modules]}})
    if total_lessons == 0: return
    done = await db.progress.count_documents({"user_id": user_id, "course_id": course_id})
    pct = (done / total_lessons) * 100
    quizzes = await db.quizzes.find({"course_id": course_id}, {"_id": 0}).to_list(20)
    quiz_passed = True
    for q in quizzes:
        a = await db.quiz_attempts.find_one({"user_id": user_id, "quiz_id": q["id"], "passed": True})
        if not a: quiz_passed = False; break
    if pct >= 90 and quiz_passed:
        existing = await db.certificates.find_one({"user_id": user_id, "course_id": course_id})
        if not existing:
            course = await db.courses.find_one({"id": course_id}, {"_id": 0})
            user = await db.users.find_one({"id": user_id}, {"_id": 0})
            cert_no = f"HG-{datetime.now().year}-{uuid.uuid4().hex[:8].upper()}"
            cert = {
                "id": new_id(), "user_id": user_id, "course_id": course_id,
                "certificate_no": cert_no, "user_name": user["full_name"],
                "course_title": course["title"], "issued_at": now_iso(),
                "verify_code": uuid.uuid4().hex[:12].upper(),
            }
            await db.certificates.insert_one(cert)
            await award_points(user_id, 100, f"Certificate: {course['title']}")
            await create_notification(user_id, "Certificate Earned!", f"You earned a certificate for {course['title']}", "certificate")

# ---------- Quiz ----------
@api_router.post("/admin/quizzes")
async def create_quiz(payload: QuizIn, user=Depends(require_role("admin", "trainer"))):
    qs = []
    for q in payload.questions:
        qs.append({"id": new_id(), **q.model_dump()})
    doc = {"id": new_id(), "course_id": payload.course_id, "title": payload.title,
           "description": payload.description, "duration_min": payload.duration_min,
           "pass_percent": payload.pass_percent, "negative_mark": payload.negative_mark,
           "shuffle": payload.shuffle, "questions": qs, "created_at": now_iso()}
    await db.quizzes.insert_one(doc); doc.pop("_id", None)
    return doc

@api_router.get("/learner/quiz/{quiz_id}")
async def start_quiz(quiz_id: str, user=Depends(current_user)):
    quiz = await db.quizzes.find_one({"id": quiz_id}, {"_id": 0})
    if not quiz: raise HTTPException(404, "Quiz not found")
    # Strip correct answers
    qs = []
    for q in quiz["questions"]:
        qs.append({k: v for k, v in q.items() if k != "correct"})
    quiz["questions"] = qs
    return quiz

@api_router.post("/learner/quiz/submit")
async def submit_quiz(payload: QuizSubmitIn, user=Depends(current_user)):
    quiz = await db.quizzes.find_one({"id": payload.quiz_id}, {"_id": 0})
    if not quiz: raise HTTPException(404, "Quiz not found")
    total_marks = sum(q.get("marks", 1) for q in quiz["questions"])
    earned = 0
    detail = []
    for q in quiz["questions"]:
        selected = payload.answers.get(q["id"], [])
        correct = q.get("correct", [])
        is_correct = sorted([s.strip().lower() for s in selected]) == sorted([c.strip().lower() for c in correct])
        if is_correct:
            earned += q.get("marks", 1)
        elif selected and quiz.get("negative_mark", 0):
            earned -= quiz["negative_mark"]
        detail.append({"question_id": q["id"], "correct": is_correct, "your_answer": selected, "expected": correct})
    pct = (earned / total_marks) * 100 if total_marks else 0
    passed = pct >= quiz.get("pass_percent", 60)
    attempt = {
        "id": new_id(), "user_id": user["id"], "quiz_id": payload.quiz_id,
        "course_id": quiz["course_id"], "score": round(earned, 2), "total": total_marks,
        "pct": round(pct, 2), "passed": passed, "time_taken_sec": payload.time_taken_sec,
        "detail": detail, "submitted_at": now_iso(),
    }
    await db.quiz_attempts.insert_one(attempt)
    await award_points(user["id"], 30 if passed else 10, f"Quiz: {quiz['title']}")
    if passed:
        await maybe_issue_certificate(user["id"], quiz["course_id"])
    attempt.pop("_id", None)
    return attempt

# ---------- Assignment ----------
@api_router.post("/admin/assignments")
async def create_assignment(payload: AssignmentIn, user=Depends(require_role("admin", "trainer"))):
    doc = {"id": new_id(), **payload.model_dump(), "created_by": user["id"], "created_at": now_iso()}
    await db.assignments.insert_one(doc); doc.pop("_id", None)
    return doc

@api_router.post("/learner/assignment/submit")
async def submit_assignment(payload: AssignmentSubmitIn, user=Depends(current_user)):
    assignment = await db.assignments.find_one({"id": payload.assignment_id}, {"_id": 0})
    if not assignment: raise HTTPException(404, "Assignment not found")
    doc = {
        "id": new_id(), "user_id": user["id"], "user_name": user["full_name"],
        "assignment_id": payload.assignment_id, "course_id": assignment["course_id"],
        "text_submission": payload.text_submission, "file_url": payload.file_url,
        "status": "submitted", "marks": None, "feedback": "",
        "submitted_at": now_iso(),
    }
    await db.submissions.insert_one(doc); doc.pop("_id", None)
    await award_points(user["id"], 20, "Assignment submitted")
    return doc

@api_router.get("/admin/submissions")
async def list_submissions(user=Depends(require_role("admin", "trainer"))):
    return await db.submissions.find({}, {"_id": 0}).sort("submitted_at", -1).to_list(500)

@api_router.post("/admin/submissions/evaluate")
async def evaluate_submission(payload: AssignmentEvaluateIn, user=Depends(require_role("admin", "trainer"))):
    sub = await db.submissions.find_one({"id": payload.submission_id}, {"_id": 0})
    if not sub: raise HTTPException(404, "Submission not found")
    await db.submissions.update_one({"id": payload.submission_id}, {"$set": {
        "marks": payload.marks, "feedback": payload.feedback, "status": "evaluated",
        "evaluated_at": now_iso(), "evaluator_id": user["id"],
    }})
    await create_notification(sub["user_id"], "Assignment Evaluated", f"Your assignment received {payload.marks} marks", "assignment")
    return {"ok": True}

@api_router.get("/learner/submissions")
async def my_submissions(user=Depends(current_user)):
    return await db.submissions.find({"user_id": user["id"]}, {"_id": 0}).sort("submitted_at", -1).to_list(500)

# ---------- Certificates ----------
@api_router.get("/learner/certificates")
async def my_certificates(user=Depends(current_user)):
    return await db.certificates.find({"user_id": user["id"]}, {"_id": 0}).sort("issued_at", -1).to_list(500)

def render_certificate_pdf(cert: dict) -> bytes:
    buf = BytesIO()
    page = landscape(A4)
    c = canvas.Canvas(buf, pagesize=page)
    W, H = page
    NAVY = HexColor("#0B1121"); RED = HexColor("#E11D48")
    GREY = HexColor("#64748B"); DARK = HexColor("#0F172A")
    c.setStrokeColor(NAVY); c.setLineWidth(2); c.rect(20, 20, W-40, H-40)
    c.setStrokeColor(RED); c.setLineWidth(0.7); c.rect(35, 35, W-70, H-70)
    c.setFillColor(NAVY); c.rect(35, H-100, W-70, 65, fill=1, stroke=0)
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 22); c.drawString(60, H-72, "Hireginie")
    c.setFillColor(RED); c.drawString(60 + c.stringWidth("Hireginie","Helvetica-Bold",22), H-72, ".")
    c.setFillColor(HexColor("#94A3B8"))
    c.setFont("Helvetica", 8); c.drawString(60, H-88, "ENTERPRISE LMS - RECRUITMENT TRAINING")
    c.setFillColor(GREY); c.setFont("Helvetica", 10)
    c.drawCentredString(W/2, H-150, "CERTIFICATE OF COMPLETION")
    c.setFillColor(DARK); c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(W/2, H-200, "This certifies that")
    c.setFillColor(RED); c.setFont("Helvetica-Bold", 30)
    c.drawCentredString(W/2, H-250, cert["user_name"])
    c.setStrokeColor(HexColor("#E2E8F0")); c.setLineWidth(0.5)
    c.line(W/2-180, H-260, W/2+180, H-260)
    c.setFillColor(DARK); c.setFont("Helvetica", 13)
    c.drawCentredString(W/2, H-290, "has successfully completed the course")
    c.setFont("Helvetica-Bold", 18); c.setFillColor(NAVY)
    c.drawCentredString(W/2, H-322, cert["course_title"])
    c.setFillColor(GREY); c.setFont("Helvetica", 8)
    c.drawString(70, 95, "CERTIFICATE NO."); c.drawString(70, 65, "DATE OF ISSUE")
    c.setFillColor(DARK); c.setFont("Helvetica-Bold", 10)
    c.drawString(70, 80, cert["certificate_no"])
    c.drawString(70, 50, cert["issued_at"][:10])
    qr = qrcode.make(f"https://hireginie.lms/verify/{cert['verify_code']}")
    qb = BytesIO(); qr.save(qb, format="PNG"); qb.seek(0)
    c.drawImage(ImageReader(qb), W-160, 50, 90, 90)
    c.setFillColor(GREY); c.setFont("Helvetica", 7)
    c.drawCentredString(W-115, 40, f"Verify: {cert['verify_code']}")
    c.setStrokeColor(DARK); c.setLineWidth(0.5); c.line(W/2-90, 80, W/2+90, 80)
    c.setFillColor(DARK); c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(W/2, 65, "Chief Learning Officer")
    c.setFillColor(GREY); c.setFont("Helvetica", 8)
    c.drawCentredString(W/2, 50, "Hireginie Learning Authority")
    c.showPage(); c.save()
    return buf.getvalue()

@api_router.get("/learner/certificates/{cert_id}/pdf")
async def download_certificate_pdf(cert_id: str, user=Depends(current_user)):
    cert = await db.certificates.find_one({"id": cert_id}, {"_id": 0})
    if not cert: raise HTTPException(404, "Certificate not found")
    if cert["user_id"] != user["id"] and user["role"] not in ("admin", "trainer"):
        raise HTTPException(403, "Not allowed")
    pdf = render_certificate_pdf(cert)
    return StreamingResponse(BytesIO(pdf), media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{cert["certificate_no"]}.pdf"'})



@api_router.get("/certificates/verify/{verify_code}")
async def verify_certificate(verify_code: str):
    cert = await db.certificates.find_one({"verify_code": verify_code}, {"_id": 0})
    if not cert: raise HTTPException(404, "Certificate not found")
    return cert

# ---------- Leaderboard ----------
@api_router.get("/leaderboard")
async def leaderboard(scope: str = "overall", user=Depends(current_user)):
    # scope: daily | weekly | monthly | overall
    if scope == "overall":
        users = await db.users.find({"role": "learner"}, {"_id": 0, "password_hash": 0}) \
            .sort("points", -1).to_list(100)
        return [{"rank": i+1, "user_id": u["id"], "login_id": u["login_id"],
                 "name": u["full_name"], "department": u.get("department", ""),
                 "points": u.get("points", 0), "badges": u.get("badges", [])}
                for i, u in enumerate(users)]
    now = datetime.now(timezone.utc)
    if scope == "daily": cutoff = now - timedelta(days=1)
    elif scope == "weekly": cutoff = now - timedelta(days=7)
    else: cutoff = now - timedelta(days=30)
    pipe = [
        {"$match": {"ts": {"$gte": cutoff.isoformat()}}},
        {"$group": {"_id": "$user_id", "points": {"$sum": "$points"}}},
        {"$sort": {"points": -1}}, {"$limit": 100},
    ]
    rows = await db.point_events.aggregate(pipe).to_list(100)
    result = []
    for i, r in enumerate(rows):
        u = await db.users.find_one({"id": r["_id"]}, {"_id": 0, "full_name": 1, "login_id": 1, "department": 1, "badges": 1})
        if not u: continue
        result.append({"rank": i+1, "user_id": r["_id"], "login_id": u["login_id"],
                       "name": u["full_name"], "department": u.get("department", ""),
                       "points": r["points"], "badges": u.get("badges", [])})
    return result

# ---------- Notifications ----------
@api_router.get("/notifications")
async def my_notifications(user=Depends(current_user)):
    return await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("ts", -1).to_list(200)

@api_router.post("/notifications/{notif_id}/read")
async def mark_read(notif_id: str, user=Depends(current_user)):
    await db.notifications.update_one({"id": notif_id, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}

# ---------- Search ----------
@api_router.get("/search")
async def search(q: str, user=Depends(current_user)):
    q_re = {"$regex": q, "$options": "i"}
    courses = await db.courses.find({"$or": [{"title": q_re}, {"description": q_re}, {"category": q_re}, {"skills": q_re}]}, {"_id": 0}).limit(20).to_list(20)
    modules = await db.modules.find({"title": q_re}, {"_id": 0}).limit(20).to_list(20)
    lessons = await db.lessons.find({"title": q_re}, {"_id": 0}).limit(20).to_list(20)
    return {"courses": courses, "modules": modules, "lessons": lessons}

# ---------- Upload ----------
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), user=Depends(current_user)):
    ext = Path(file.filename).suffix
    fname = f"{new_id()}{ext}"
    fpath = UPLOAD_DIR / fname
    with fpath.open("wb") as out:
        shutil.copyfileobj(file.file, out)
    return {"url": f"/api/files/{fname}", "filename": file.filename, "size": fpath.stat().st_size}

@api_router.post("/upload/multi")
async def upload_multi(files: List[UploadFile] = File(...), user=Depends(current_user)):
    results = []
    for file in files:
        ext = Path(file.filename).suffix.lower()
        fname = f"{new_id()}{ext}"
        fpath = UPLOAD_DIR / fname
        with fpath.open("wb") as out:
            shutil.copyfileobj(file.file, out)
        # Infer content type
        ctype = "doc"
        if ext in [".mp4",".mov",".webm",".avi"]: ctype = "video"
        elif ext == ".pdf": ctype = "pdf"
        elif ext in [".ppt",".pptx"]: ctype = "ppt"
        elif ext in [".doc",".docx"]: ctype = "doc"
        elif ext in [".png",".jpg",".jpeg",".webp"]: ctype = "link"
        results.append({"url": f"/api/files/{fname}", "filename": file.filename,
                         "size": fpath.stat().st_size, "content_type": ctype})
    return {"files": results}

@api_router.post("/admin/modules/{module_id}/bulk-lessons")
async def bulk_create_lessons(module_id: str, payload: dict, user=Depends(require_role("admin","trainer"))):
    """payload = {lessons: [{title, content_type, content_url, duration_min}]}"""
    module = await db.modules.find_one({"id": module_id}, {"_id": 0})
    if not module: raise HTTPException(404, "Module not found")
    existing = await db.lessons.count_documents({"module_id": module_id})
    created = []
    for i, l in enumerate(payload.get("lessons", [])):
        doc = {"id": new_id(), "module_id": module_id, "title": l.get("title","Untitled"),
               "content_type": l.get("content_type","doc"), "content_url": l.get("content_url",""),
               "text_content": "", "duration_min": l.get("duration_min", 10),
               "order": existing + i, "created_at": now_iso()}
        await db.lessons.insert_one(doc); doc.pop("_id", None)
        created.append(doc)
    return {"created": created}

@api_router.get("/files/{fname}")
async def serve_file(fname: str):
    fpath = UPLOAD_DIR / fname
    if not fpath.exists(): raise HTTPException(404, "Not found")
    return FileResponse(fpath)

# ---------- Dashboards / Analytics ----------
@api_router.get("/learner/dashboard")
async def learner_dashboard(user=Depends(current_user)):
    assigned_ids = user.get("assigned_courses", [])
    courses = []
    for cid in assigned_ids:
        c = await db.courses.find_one({"id": cid}, {"_id": 0})
        if not c: continue
        modules = await db.modules.find({"course_id": cid}).to_list(50)
        total_lessons = await db.lessons.count_documents({"module_id": {"$in": [m["id"] for m in modules]}})
        done = await db.progress.count_documents({"user_id": user["id"], "course_id": cid})
        c["progress_pct"] = round((done / total_lessons) * 100, 1) if total_lessons else 0
        courses.append(c)
    certs = await db.certificates.count_documents({"user_id": user["id"]})
    pending_assignments = await db.assignments.find({"course_id": {"$in": assigned_ids}}, {"_id": 0}).to_list(100)
    submitted_ids = {s["assignment_id"] for s in await db.submissions.find({"user_id": user["id"]}).to_list(500)}
    pending_assignments = [a for a in pending_assignments if a["id"] not in submitted_ids]
    # rank
    all_users = await db.users.find({"role": "learner"}, {"_id": 0, "id": 1, "points": 1}).sort("points", -1).to_list(2000)
    rank = next((i+1 for i, u in enumerate(all_users) if u["id"] == user["id"]), None)
    learning_hours = round(sum(p.get("duration_min", 0) for p in await db.lessons.find({"id": {"$in": [pr["lesson_id"] for pr in await db.progress.find({"user_id": user["id"]}).to_list(2000)]}}).to_list(2000)) / 60, 1)
    return {
        "courses": courses, "certificates_count": certs,
        "pending_assignments": pending_assignments, "rank": rank, "points": user.get("points", 0),
        "learning_hours": learning_hours,
    }

@api_router.get("/admin/analytics")
async def admin_analytics(user=Depends(require_role("admin", "trainer"))):
    total_users = await db.users.count_documents({})
    learners = await db.users.count_documents({"role": "learner"})
    active = await db.users.count_documents({"status": "active"})
    courses_count = await db.courses.count_documents({})
    certs = await db.certificates.count_documents({})
    submissions = await db.submissions.count_documents({})
    attempts = await db.quiz_attempts.find({}, {"_id": 0}).to_list(5000)
    avg_score = round(sum(a["pct"] for a in attempts) / len(attempts), 1) if attempts else 0
    pass_rate = round(sum(1 for a in attempts if a["passed"]) / len(attempts) * 100, 1) if attempts else 0
    # Top performers
    top = await db.users.find({"role": "learner"}, {"_id": 0, "password_hash": 0}).sort("points", -1).limit(5).to_list(5)
    # Course engagement
    courses = await db.courses.find({}, {"_id": 0}).to_list(500)
    engagement = []
    for c in courses:
        enrolled = await db.users.count_documents({"assigned_courses": c["id"]})
        completed = await db.certificates.count_documents({"course_id": c["id"]})
        engagement.append({"course": c["title"], "category": c["category"],
                          "enrolled": enrolled, "completed": completed})
    # Dept reports
    by_dept = {}
    all_learners = await db.users.find({"role": "learner"}, {"_id": 0, "department": 1, "points": 1}).to_list(2000)
    for u in all_learners:
        d = u.get("department", "Unassigned") or "Unassigned"
        by_dept.setdefault(d, {"users": 0, "points": 0})
        by_dept[d]["users"] += 1
        by_dept[d]["points"] += u.get("points", 0)
    dept_report = [{"department": k, **v} for k, v in by_dept.items()]
    return {
        "kpis": {"total_users": total_users, "learners": learners, "active": active,
                 "courses": courses_count, "certificates": certs, "submissions": submissions,
                 "avg_score": avg_score, "pass_rate": pass_rate},
        "top_performers": top, "engagement": engagement, "departments": dept_report,
    }

# ---------- AI ----------
def make_chat(session_id: str, system: str) -> LlmChat:
    return LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=system) \
        .with_model("openai", "gpt-5.4")

@api_router.post("/ai/chat")
async def ai_chat(payload: AiChatIn, user=Depends(current_user)):
    sid = payload.session_id or f"chat-{user['id']}"
    ctx = ""
    if payload.course_id:
        course = await db.courses.find_one({"id": payload.course_id}, {"_id": 0})
        if course:
            ctx = f"\nCurrent course context: {course['title']} ({course['category']}). Description: {course['description']}"
            modules = await db.modules.find({"course_id": payload.course_id}, {"_id": 0}).to_list(50)
            for m in modules[:5]:
                lessons = await db.lessons.find({"module_id": m["id"]}, {"_id": 0, "title": 1, "text_content": 1}).to_list(20)
                ctx += f"\nModule: {m['title']}: " + "; ".join(l["title"] for l in lessons)
    system = (f"You are Genie, the AI learning assistant for Hireginie LMS, an HR recruitment training platform. "
              f"Help recruiters and learners with concepts, examples, and guidance. Be concise and practical.{ctx}")
    chat = make_chat(sid, system)
    reply = await chat.send_message(UserMessage(text=payload.message))
    await db.chat_history.insert_one({"id": new_id(), "user_id": user["id"], "session_id": sid,
                                       "question": payload.message, "answer": reply, "ts": now_iso()})
    return {"answer": reply, "session_id": sid}

@api_router.post("/ai/quiz-generate")
async def ai_quiz_generate(payload: AiQuizGenIn, user=Depends(require_role("admin", "trainer"))):
    sys_msg = ("You are a quiz generator. Output ONLY valid JSON. Generate MCQ questions from the given content. "
               "Format: {\"questions\":[{\"text\":\"...\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"correct\":[\"A\"],\"type\":\"single\",\"marks\":1}]}")
    chat = make_chat(f"quizgen-{user['id']}-{datetime.now().timestamp()}", sys_msg)
    prompt = f"Generate {payload.num_questions} MCQs from this content. Return ONLY JSON.\n\nContent:\n{payload.text[:6000]}"
    reply = await chat.send_message(UserMessage(text=prompt))
    import json, re
    try:
        m = re.search(r'\{.*\}', reply, re.DOTALL)
        data = json.loads(m.group(0)) if m else {"questions": []}
    except Exception:
        data = {"questions": [], "raw": reply}
    return data

@api_router.post("/ai/summarize")
async def ai_summarize(payload: AiSummarizeIn, user=Depends(current_user)):
    chat = make_chat(f"summary-{user['id']}-{datetime.now().timestamp()}",
                     "You are a content summarizer for a training platform. Produce a concise, structured summary with key takeaways and a bulleted list of action items.")
    reply = await chat.send_message(UserMessage(text=f"Summarize this content:\n\n{payload.text[:8000]}"))
    return {"summary": reply}

@api_router.get("/ai/recommend")
async def ai_recommend(user=Depends(current_user)):
    # Simple heuristic + AI
    all_courses = await db.courses.find({"is_published": True}, {"_id": 0}).to_list(200)
    assigned = set(user.get("assigned_courses", []))
    not_assigned = [c for c in all_courses if c["id"] not in assigned]
    if not not_assigned:
        return {"recommendations": [], "reason": "You're enrolled in all available courses!"}
    # Use designation as signal
    designation = (user.get("designation") or "").lower()
    dept = (user.get("department") or "").lower()
    scored = []
    for c in not_assigned:
        score = 0
        if "tech" in designation and "Technical" in c["category"]: score += 5
        if "bfsi" in designation or "bank" in dept and "BFSI" in c["category"]: score += 5
        if "advanced" in designation and "Advanced" in c["category"]: score += 3
        if c["level"] == "Beginner": score += 1
        scored.append((score, c))
    scored.sort(key=lambda x: -x[0])
    recs = [c for _, c in scored[:6]]
    return {"recommendations": recs, "reason": f"Based on your role: {user.get('designation', 'Learner')}"}

# ---------- Health ----------
@api_router.get("/")
async def root():
    return {"app": "Hireginie LMS", "status": "ok", "time": now_iso()}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"], allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    # Indexes
    await db.users.create_index("login_id", unique=True)
    await db.users.create_index("email")
    await db.courses.create_index("category")
    await db.progress.create_index([("user_id", 1), ("lesson_id", 1)], unique=True)
    await db.certificates.create_index("verify_code", unique=True)
    # Auto seed if empty
    if await db.users.count_documents({}) == 0:
        from seed import run_seed
        await run_seed(db)
        logger.info("Seeded initial data.")

@app.on_event("shutdown")
async def shutdown():
    client.close()
