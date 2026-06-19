"""Seed initial data for Hireginie LMS."""
import uuid, bcrypt
from datetime import datetime, timezone, timedelta

def now_iso(): return datetime.now(timezone.utc).isoformat()
def new_id(): return str(uuid.uuid4())
def hash_pw(pw): return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

CATEGORIES = {
    "Recruitment Basics": [
        ("Introduction to Recruitment", "Foundations of modern recruitment for new recruiters."),
        ("Recruitment Lifecycle", "End-to-end lifecycle from req intake to onboarding."),
        ("Candidate Sourcing", "Active and passive sourcing strategies."),
        ("Screening Techniques", "Screening calls, structured interviews, scorecards."),
    ],
    "Technical Recruitment": [
        ("Software Development Basics", "SDLC, languages, frameworks for tech recruiters."),
        ("Cloud Computing", "AWS, Azure, GCP fundamentals for recruiters."),
        ("Data Engineering", "Pipelines, warehouses, ETL roles."),
        ("Artificial Intelligence", "ML, DL, GenAI roles and skills."),
    ],
    "Non-Technical Recruitment": [
        ("Sales Hiring", "Hunter vs farmer profiles, quota-based hiring."),
        ("HR Hiring", "HRBP, talent ops, HR analytics roles."),
    ],
    "BFSI Recruitment": [
        ("Banking Roles", "Retail, corporate, private banking profiles."),
        ("Investment Banking", "M&A, equity research, ECM/DCM roles."),
    ],
    "Volume Hiring": [
        ("Bulk Recruitment", "BPO, KPO, mass hiring drives at scale."),
        ("Campus Hiring", "Campus calendars, assessment-led hiring."),
    ],
    "Advanced Recruitment": [
        ("Boolean Search", "Crafting precise boolean strings on LinkedIn/Google."),
        ("Talent Mapping", "Market intelligence and competitor mapping."),
        ("Negotiation Skills", "Offer negotiation and closing techniques."),
    ],
}

DEPARTMENTS = ["Talent Acquisition", "Technical Recruitment", "BFSI Recruitment", "Volume Hiring", "Operations", "HR Business Partners"]

async def run_seed(db):
    # Config
    await db.config.insert_one({"key": "employee_range", "start": 1001, "end": 1500})

    # Departments
    for d in DEPARTMENTS:
        await db.departments.insert_one({"id": new_id(), "name": d, "description": "", "created_at": now_iso()})

    # Users
    admins = [
        ("AD1001", "Aarav Mehta", "aarav@hireginie.com", "admin", "Operations", "Chief Learning Officer"),
        ("AD1002", "Priya Sharma", "priya@hireginie.com", "trainer", "Talent Acquisition", "Senior Trainer"),
    ]
    learners = [
        ("1001", "Rohan Iyer", "rohan@hireginie.com", "Technical Recruitment", "Tech Recruiter"),
        ("1002", "Sneha Kapoor", "sneha@hireginie.com", "BFSI Recruitment", "BFSI Specialist"),
        ("1003", "Aditya Verma", "aditya@hireginie.com", "Talent Acquisition", "TA Lead"),
        ("1004", "Meera Nair", "meera@hireginie.com", "Volume Hiring", "Volume Recruiter"),
        ("1005", "Kabir Singh", "kabir@hireginie.com", "Technical Recruitment", "Tech Recruiter"),
        ("1006", "Ananya Gupta", "ananya@hireginie.com", "Operations", "Recruitment Coordinator"),
        ("1007", "Vikram Joshi", "vikram@hireginie.com", "HR Business Partners", "HRBP"),
        ("1008", "Riya Bhat", "riya@hireginie.com", "BFSI Recruitment", "Junior Recruiter"),
    ]
    user_ids = {}
    for login_id, name, email, role, dept, desig in admins:
        uid = new_id()
        user_ids[login_id] = uid
        await db.users.insert_one({
            "id": uid, "login_id": login_id, "full_name": name, "email": email,
            "mobile": "", "department": dept, "designation": desig, "joining_date": "2024-01-15",
            "reporting_manager": "", "role": role,
            "password_hash": hash_pw("Welcome@123"), "must_change_password": False,
            "policy_accepted": True, "status": "active", "points": 0, "badges": ["Beginner Recruiter"],
            "assigned_courses": [], "created_at": now_iso(),
        })
    for login_id, name, email, dept, desig in learners:
        uid = new_id()
        user_ids[login_id] = uid
        await db.users.insert_one({
            "id": uid, "login_id": login_id, "full_name": name, "email": email,
            "mobile": "", "department": dept, "designation": desig, "joining_date": "2024-06-01",
            "reporting_manager": "AD1001", "role": "learner",
            "password_hash": hash_pw("Welcome@123"), "must_change_password": False,
            "policy_accepted": True, "status": "active", "points": 0, "badges": [],
            "assigned_courses": [], "created_at": now_iso(),
        })

    # Courses + modules + lessons + quizzes
    levels = ["Beginner", "Intermediate", "Advanced"]
    thumbs = [
        "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&q=80",
        "https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&q=80",
        "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&q=80",
        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80",
        "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&q=80",
        "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&q=80",
    ]
    course_ids_by_cat = {}
    ti = 0
    all_course_ids = []
    for cat, items in CATEGORIES.items():
        for title, desc in items:
            cid = new_id()
            all_course_ids.append(cid)
            course_ids_by_cat.setdefault(cat, []).append(cid)
            await db.courses.insert_one({
                "id": cid, "title": title, "description": desc, "category": cat,
                "sub_category": "", "thumbnail": thumbs[ti % len(thumbs)],
                "duration_hours": 3 + (ti % 5), "level": levels[ti % 3],
                "skills": [cat.lower(), title.split()[0].lower()], "is_published": True,
                "created_by": user_ids["AD1002"], "created_at": now_iso(),
            })
            ti += 1
            # 2 modules each
            for mi in range(2):
                mid = new_id()
                await db.modules.insert_one({
                    "id": mid, "course_id": cid,
                    "title": f"Module {mi+1}: {title} {'Fundamentals' if mi==0 else 'Deep Dive'}",
                    "description": "", "order": mi, "created_at": now_iso(),
                })
                # 3 lessons each
                lesson_specs = [
                    ("video", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "", 12),
                    ("notes", "", f"Key notes for {title} (Module {mi+1}). This is the core curriculum content covering theory, frameworks, and practical examples.\n\n- Concept 1: Foundation\n- Concept 2: Application\n- Concept 3: Best practices\n- Concept 4: Common pitfalls", 8),
                    ("youtube", "https://www.youtube.com/watch?v=ZXsQAXx_ao0", "", 10),
                ]
                for li, (ctype, url, text, dur) in enumerate(lesson_specs):
                    await db.lessons.insert_one({
                        "id": new_id(), "module_id": mid,
                        "title": f"Lesson {li+1}: {['Overview','Deep dive','Case study'][li]}",
                        "content_type": ctype, "content_url": url, "text_content": text,
                        "duration_min": dur, "order": li, "created_at": now_iso(),
                    })
            # 1 quiz per course
            qid = new_id()
            await db.quizzes.insert_one({
                "id": qid, "course_id": cid, "title": f"{title} - Final Quiz",
                "description": f"Test your knowledge of {title}",
                "duration_min": 10, "pass_percent": 60, "negative_mark": 0, "shuffle": True,
                "questions": [
                    {"id": new_id(), "text": f"Which of the following best describes {title}?",
                     "type": "single", "options": ["A foundational concept", "Unrelated topic", "An obsolete process", "None"],
                     "correct": ["A foundational concept"], "marks": 1},
                    {"id": new_id(), "text": "Recruitment is a continuous process.",
                     "type": "truefalse", "options": ["True", "False"], "correct": ["True"], "marks": 1},
                    {"id": new_id(), "text": "Which are key parts of the recruitment lifecycle? (select all)",
                     "type": "multiple",
                     "options": ["Sourcing", "Screening", "Offer", "Coding"],
                     "correct": ["Sourcing", "Screening", "Offer"], "marks": 2},
                    {"id": new_id(), "text": "Fill in: A ____ search uses operators like AND, OR, NOT.",
                     "type": "fill", "options": [], "correct": ["boolean"], "marks": 1},
                ],
                "created_at": now_iso(),
            })
            # 1 assignment per course
            await db.assignments.insert_one({
                "id": new_id(), "course_id": cid, "title": f"{title} - Practical Assignment",
                "description": f"Apply {title} concepts to a real scenario.",
                "instructions": "Submit a short writeup (~300 words) or upload a document with your answer.",
                "due_date": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
                "max_marks": 100, "created_by": user_ids["AD1002"], "created_at": now_iso(),
            })

    # Assign 4 random courses to each learner
    import random
    random.seed(42)
    learner_ids = [uid for lid, uid in user_ids.items() if lid.isdigit()]
    for uid in learner_ids:
        picks = random.sample(all_course_ids, 4)
        await db.users.update_one({"id": uid}, {"$set": {"assigned_courses": picks}})

    # Give some seed points so leaderboard has data
    pts = [(user_ids["1001"], 320), (user_ids["1002"], 280), (user_ids["1003"], 245),
           (user_ids["1004"], 210), (user_ids["1005"], 180), (user_ids["1006"], 150),
           (user_ids["1007"], 120), (user_ids["1008"], 90)]
    for uid, p in pts:
        await db.users.update_one({"id": uid}, {"$set": {"points": p}})
        await db.point_events.insert_one({"id": new_id(), "user_id": uid, "points": p,
                                          "reason": "Onboarding bonus", "ts": now_iso()})
