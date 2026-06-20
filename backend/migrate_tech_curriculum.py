"""One-shot migration: replace seeded Technical Recruitment content with the
HireGenie comprehensive curriculum extracted from the v2 spreadsheet."""
import asyncio, uuid, os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
def now(): return datetime.now(timezone.utc).isoformat()
def nid(): return str(uuid.uuid4())

# Section → (course title, sub-category, level, thumbnail, list of (lesson_title, url, duration, content_type))
SECTIONS = {
    "RECRUITMENT FOUNDATIONS": {
        "title": "Tech Recruitment Foundations",
        "level": "Beginner", "thumb": "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&q=80",
        "lessons": [
            ("Role & Career Ladders – Tech Hiring Basics", "https://docs.google.com/document/d/1Z1Xxow0kRc8nbVNZRZQgnc3Aq8yORalLxSmpYmlxUMQ/edit", 15, "link"),
            ("SDE Levels Explained – SDE1 / SDE2 / SDE3", "https://www.youtube.com/watch?v=eEXWkn3NnhE", 8, "youtube"),
            ("The Software Engineering Ladder Explained", "https://www.youtube.com/watch?v=mea5HZHekpw", 9, "youtube"),
            ("Role & Persona – QA Engineer", "https://www.youtube.com/watch?v=kheeYZ5dU5k", 7, "youtube"),
            ("Role & Persona – SDET", "https://www.youtube.com/watch?v=GpZlsuLZWO4", 7, "youtube"),
            ("Role & Persona – Technical Programme Manager (TPM)", "https://www.youtube.com/watch?v=h-8ntfktbpM", 8, "youtube"),
            ("Software Development Lifecycle (SDLC)", "https://www.youtube.com/watch?v=Fi3_BjVzpqk", 7, "youtube"),
            ("Scrum / Agile Practice", "https://www.youtube.com/watch?v=1CxWF42WQFo", 8, "youtube"),
            ("Code Reviews – Best Practices", "https://www.youtube.com/watch?v=dWddHWU3_YM", 7, "youtube"),
            ("PMP / Project Management Certification Overview", "https://www.youtube.com/watch?v=x1POqDjbqmU", 9, "youtube"),
        ]},
    "PYTHON ECOSYSTEM": {
        "title": "Python Ecosystem for Recruiters",
        "level": "Beginner", "thumb": "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=600&q=80",
        "lessons": [
            ("Python in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=x7X9w_GIm1s", 2, "youtube"),
            ("Python for Beginners – Full Overview (Mosh)", "https://www.youtube.com/watch?v=kqtD5dpn9C8", 6, "youtube"),
            ("Python vs Java – Which & When?", "https://www.youtube.com/watch?v=HKdMzMSNvbo", 7, "youtube"),
            ("Django in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=rHux0gMZ3Eg", 2, "youtube"),
            ("FastAPI Explained – Modern Python APIs", "https://www.youtube.com/watch?v=0RS9W8MtZe4", 7, "youtube"),
            ("What Is Python Used For? (Data, AI, Web, Automation)", "https://www.youtube.com/watch?v=Y8Tko2YC5hA", 6, "youtube"),
        ]},
    "JAVA ECOSYSTEM": {
        "title": "Java Ecosystem for Recruiters",
        "level": "Beginner", "thumb": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80",
        "lessons": [
            ("What Is Java Programming?", "https://www.youtube.com/watch?v=mAtkPQO1FcA", 8, "youtube"),
            ("Java Stack Deep Dive", "https://www.youtube.com/watch?v=fptlqsesjxY", 8, "youtube"),
            ("Java Design Patterns", "https://www.youtube.com/watch?v=tDxnyop48mY", 9, "youtube"),
            ("Spring Framework in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=Spzug_SjJnM", 2, "youtube"),
            ("Hibernate (ORM) Explained", "https://www.youtube.com/watch?v=PMR0ld5h938", 8, "youtube"),
        ]},
    "JAVASCRIPT & TYPESCRIPT": {
        "title": "JavaScript & TypeScript Stack",
        "level": "Beginner", "thumb": "https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=600&q=80",
        "lessons": [
            ("Core JavaScript in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=DHjqpvDnNGE", 2, "youtube"),
            ("Modern JavaScript Frameworks Overview", "https://www.youtube.com/watch?v=VbvMJUpY0a4", 8, "youtube"),
            ("React in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=Tn6-PIqc4UM", 2, "youtube"),
            ("Redux Explained", "https://www.youtube.com/watch?v=nFryvdyMI8s", 8, "youtube"),
            ("TypeScript in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=zQnBQ4tB3ZA", 2, "youtube"),
            ("TypeScript vs JavaScript – Key Differences for Recruiters", "https://www.youtube.com/watch?v=ahCwqrYpIuM", 7, "youtube"),
            ("React Native in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=gvkqT_Uoahw", 2, "youtube"),
        ]},
    "WEB DEVELOPMENT": {
        "title": "Web Development Landscape",
        "level": "Intermediate", "thumb": "https://images.unsplash.com/photo-1547658719-da2b51169166?w=600&q=80",
        "lessons": [
            ("Frontend Web Development – Complete Overview", "https://www.youtube.com/watch?v=WG5ikvJ2TKA", 8, "youtube"),
            ("HTML5 Explained", "https://www.youtube.com/watch?v=mzPxo7Y6JyA", 7, "youtube"),
            ("CSS – How It Works", "https://www.youtube.com/watch?v=XPv4EeB0PJ8", 7, "youtube"),
            ("CSS Grid vs Flexbox", "https://www.youtube.com/watch?v=DXxt4oIAI4Y", 8, "youtube"),
            ("Responsive Design", "https://www.youtube.com/watch?v=yP2zI-Em5lg", 7, "youtube"),
            ("Bootstrap Framework", "https://www.youtube.com/watch?v=qj9OlUxvW48", 7, "youtube"),
            ("SASS in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=akDIJa0AP5c", 2, "youtube"),
            ("Web Standards Explained", "https://www.youtube.com/watch?v=Lokcn7PCqJY", 7, "youtube"),
            ("Cross-Browser Compatibility Testing", "https://www.youtube.com/watch?v=_qVWNQzyrAQ", 6, "youtube"),
            ("SEO / Search Engine Optimisation", "https://www.youtube.com/watch?v=MYE6T_gd7H0", 8, "youtube"),
            ("UI & UX Layouts for Developers", "https://www.youtube.com/watch?v=zHAa-m16NGk", 8, "youtube"),
            ("Backend Web Development – Complete Overview", "https://www.youtube.com/watch?v=XBu54nfzxAQ", 8, "youtube"),
            ("REST APIs Explained", "https://www.youtube.com/watch?v=lsMQRaeKNDk", 8, "youtube"),
            ("GraphQL in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=eIQh02xuVw4", 2, "youtube"),
        ]},
    "SYSTEM DESIGN & ARCHITECTURE": {
        "title": "System Design & Architecture",
        "level": "Advanced", "thumb": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&q=80",
        "lessons": [
            ("Low-Level & High-Level Design (LLD / HLD)", "https://www.youtube.com/watch?v=H703ErIrby8", 9, "youtube"),
            ("Software Architecture & Design Patterns", "https://www.youtube.com/watch?v=i7aKW7YNOxY", 9, "youtube"),
            ("What Is Full Stack Development?", "https://www.youtube.com/watch?v=8KaJRw-rfn8", 8, "youtube"),
            ("Microservices & Distributed Systems Explained", "https://www.youtube.com/watch?v=CdBtNQZH8a4", 9, "youtube"),
            ("Apache Kafka in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=uvb00oaa3k8", 2, "youtube"),
            ("RabbitMQ Explained", "https://www.youtube.com/watch?v=AskUF2mebi4", 8, "youtube"),
            ("ZooKeeper Explained", "https://www.youtube.com/watch?v=AS5a91DOmks", 8, "youtube"),
        ]},
    "DATABASES & DATA STORAGE": {
        "title": "Databases & Data Storage",
        "level": "Intermediate", "thumb": "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&q=80",
        "lessons": [
            ("RDBMS Concepts Explained", "https://www.youtube.com/watch?v=OqjJjpjDRLc", 8, "youtube"),
            ("MySQL in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=Cz3WcZLRaWc", 2, "youtube"),
            ("PostgreSQL Explained", "https://www.youtube.com/watch?v=qw--VYLpxG4", 8, "youtube"),
            ("MS SQL Server Overview", "https://www.youtube.com/watch?v=pF8n-8DPvjc", 8, "youtube"),
            ("MongoDB in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=-bt_y4Loofg", 2, "youtube"),
            ("Cassandra Explained", "https://www.youtube.com/watch?v=5uqmpe7JkYo", 8, "youtube"),
            ("Redis in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=G1rOthIU-uo", 2, "youtube"),
            ("Elasticsearch Explained", "https://www.youtube.com/watch?v=ZP0NmfyfsoM", 8, "youtube"),
        ]},
    "DEVOPS, CI/CD & CONTAINERS": {
        "title": "DevOps, CI/CD & Containers",
        "level": "Intermediate", "thumb": "https://images.unsplash.com/photo-1605379399642-870262d3d051?w=600&q=80",
        "lessons": [
            ("DevOps in 5 Minutes – Quick Explainer", "https://www.youtube.com/watch?v=Xrgk023l4lI", 5, "youtube"),
            ("What Is DevOps? – TechWorld with Nana", "https://www.youtube.com/watch?v=0yWAtQ6wYNM", 8, "youtube"),
            ("DevOps vs SRE – Key Differences", "https://www.youtube.com/watch?v=uTEL8Ff1Zvk", 7, "youtube"),
            ("CI/CD Explained in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=scEDHsr3APg", 2, "youtube"),
            ("GitHub Actions in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=eB0nUzAI7M8", 2, "youtube"),
            ("Jenkins Explained – CI/CD Tool", "https://www.youtube.com/watch?v=LFDrDnKPOTg", 8, "youtube"),
            ("Docker in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=Gjnup-PuquQ", 2, "youtube"),
            ("Kubernetes in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=PziYflu8cB8", 2, "youtube"),
            ("Kubernetes vs Docker – What's the Difference?", "https://www.youtube.com/watch?v=2vMEQ5zs1ko", 7, "youtube"),
            ("Terraform Explained in 5 Minutes", "https://www.youtube.com/watch?v=1pH1F6s5EQI", 5, "youtube"),
            ("Ansible in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=xRMPrJ9-bW8", 2, "youtube"),
        ]},
    "AI, ML & GENERATIVE AI": {
        "title": "AI, ML & Generative AI for Recruiters",
        "level": "Advanced", "thumb": "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&q=80",
        "lessons": [
            ("Machine Learning in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=ukzFI9rgwfU", 8, "youtube"),
            ("AI vs ML vs Deep Learning – Key Differences", "https://www.youtube.com/watch?v=4RixMPF4xis", 8, "youtube"),
            ("Neural Networks Explained in 5 Minutes", "https://www.youtube.com/watch?v=bfmFfD2RIcg", 5, "youtube"),
            ("Natural Language Processing (NLP) Explained", "https://www.youtube.com/watch?v=CMrHM8a3hqw", 7, "youtube"),
            ("Generative AI Explained in 5 Minutes – IBM", "https://www.youtube.com/watch?v=NRmAXDWJVnU", 5, "youtube"),
            ("What Are LLMs? Large Language Models Explained", "https://www.youtube.com/watch?v=osKyvYJ3PRM", 7, "youtube"),
            ("Prompt Engineering in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=_ZvnD73m40o", 2, "youtube"),
            ("MLOps Explained – What It Is & Why It Matters", "https://www.youtube.com/watch?v=ZVWg18AXXuE", 8, "youtube"),
            ("AI Engineer vs ML Engineer vs Data Scientist", "https://www.youtube.com/watch?v=Q0-hy8phwTA", 8, "youtube"),
        ]},
    "DATA ENGINEERING & ANALYTICS": {
        "title": "Data Engineering & Analytics",
        "level": "Intermediate", "thumb": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80",
        "lessons": [
            ("Data Engineer vs Data Scientist vs Data Analyst", "https://www.youtube.com/watch?v=0uApqQ41fxw", 7, "youtube"),
            ("What Does a Data Engineer Do? – Role Explained", "https://www.youtube.com/watch?v=qWru-b6m030", 8, "youtube"),
            ("Apache Spark Explained in 5 Minutes", "https://www.youtube.com/watch?v=QaoJNXW6SQo", 5, "youtube"),
            ("Data Warehousing vs Data Lake vs Lakehouse", "https://www.youtube.com/watch?v=RptHNxTKuvA", 8, "youtube"),
            ("dbt (Data Build Tool) Explained", "https://www.youtube.com/watch?v=M8oi7nSaWps", 7, "youtube"),
            ("SQL for Data Engineers – Why It Still Matters", "https://www.youtube.com/watch?v=HXV3zeQKqGY", 8, "youtube"),
            ("Snowflake in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=9PBvVeCQi0w", 2, "youtube"),
        ]},
    "CLOUD PLATFORMS & SERVICES": {
        "title": "Cloud Platforms & Services",
        "level": "Intermediate", "thumb": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80",
        "lessons": [
            ("AWS in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=a9__D53WsUs", 8, "youtube"),
            ("Microsoft Azure Overview", "https://www.youtube.com/watch?v=3Arj5zlUPG4", 8, "youtube"),
            ("Google Cloud Platform (GCP) Overview", "https://www.youtube.com/watch?v=6yQLmHm2cOk", 8, "youtube"),
            ("AWS Lambda – Serverless in 100 Seconds", "https://www.youtube.com/watch?v=eOBq__h4OJ4", 8, "youtube"),
            ("AWS S3 Explained", "https://www.youtube.com/watch?v=6brzBokCYV0", 8, "youtube"),
            ("API Gateway Explained", "https://www.youtube.com/watch?v=4sCUV0WGPxw", 8, "youtube"),
        ]},
    "CYBERSECURITY BASICS": {
        "title": "Cybersecurity Basics for Recruiters",
        "level": "Beginner", "thumb": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&q=80",
        "lessons": [
            ("Cybersecurity in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=inWWhr5tnEA", 2, "youtube"),
            ("OWASP Top 10 Security Risks – Explained Simply", "https://www.youtube.com/watch?v=t0byP7RlASQ", 8, "youtube"),
            ("DevSecOps – What Is It and Why It Matters", "https://www.youtube.com/watch?v=J73MELGF1m0", 7, "youtube"),
            ("OAuth 2.0 & Authentication in 100 Seconds", "https://www.youtube.com/watch?v=t18YB3xDfXI", 2, "youtube"),
            ("AppSec Engineer Role – What Recruiters Need to Know", "https://www.youtube.com/watch?v=3l_L2CAIxOQ", 7, "youtube"),
        ]},
    "QA & TESTING": {
        "title": "QA & Testing",
        "level": "Intermediate", "thumb": "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&q=80",
        "lessons": [
            ("Regression Testing Explained", "https://www.youtube.com/watch?v=AWX6WvYktwk", 7, "youtube"),
            ("Shift-Left Testing – Why It Matters", "https://www.youtube.com/watch?v=bpHcKMApjrY", 7, "youtube"),
            ("Selenium Explained", "https://www.youtube.com/watch?v=BL4-_tVx2rE", 8, "youtube"),
            ("Rest Assured – API Test Automation", "https://www.youtube.com/watch?v=oVNbaBlrhbo", 8, "youtube"),
            ("Cypress in 100 Seconds – Fireship", "https://www.youtube.com/watch?v=BQqzfHQkREo", 2, "youtube"),
        ]},
}

async def run():
    # Step 1: Identify Technical Recruitment courses to wipe
    old_courses = await db.courses.find({"category": "Technical Recruitment"}, {"_id": 0, "id": 1}).to_list(500)
    old_ids = [c["id"] for c in old_courses]
    if old_ids:
        old_modules = await db.modules.find({"course_id": {"$in": old_ids}}).to_list(2000)
        old_module_ids = [m["id"] for m in old_modules]
        await db.lessons.delete_many({"module_id": {"$in": old_module_ids}})
        await db.modules.delete_many({"course_id": {"$in": old_ids}})
        await db.quizzes.delete_many({"course_id": {"$in": old_ids}})
        await db.assignments.delete_many({"course_id": {"$in": old_ids}})
        await db.courses.delete_many({"id": {"$in": old_ids}})
        print(f"Wiped {len(old_ids)} old Technical Recruitment courses + dependencies")

    # Step 2: Insert new HireGenie curriculum
    trainer = await db.users.find_one({"role": {"$in": ["admin","trainer"]}}, {"_id": 0, "id": 1})
    trainer_id = trainer["id"] if trainer else "system"

    for section_key, info in SECTIONS.items():
        course_id = nid()
        total_min = sum(l[2] for l in info["lessons"])
        await db.courses.insert_one({
            "id": course_id, "title": info["title"],
            "description": f"Curated training videos for tech recruiters — {section_key.title()}. {len(info['lessons'])} videos covering the most asked-about concepts.",
            "category": "Technical Recruitment", "sub_category": section_key,
            "thumbnail": info["thumb"], "duration_hours": round(total_min/60, 1),
            "level": info["level"], "skills": [section_key.lower()], "is_published": True,
            "created_by": trainer_id, "created_at": now(),
        })
        module_id = nid()
        await db.modules.insert_one({
            "id": module_id, "course_id": course_id, "title": f"{info['title']} — Core Videos",
            "description": "All curated videos in this section.", "order": 0, "created_at": now(),
        })
        for i, (title, url, dur, ctype) in enumerate(info["lessons"]):
            await db.lessons.insert_one({
                "id": nid(), "module_id": module_id, "title": title,
                "content_type": ctype, "content_url": url, "text_content": "",
                "duration_min": dur, "order": i, "created_at": now(),
            })
        # Mini quiz per course for certificate eligibility
        await db.quizzes.insert_one({
            "id": nid(), "course_id": course_id, "title": f"{info['title']} – Knowledge Check",
            "description": f"Quick check to confirm you've absorbed the {section_key.title()} videos.",
            "duration_min": 5, "pass_percent": 60, "negative_mark": 0, "shuffle": True,
            "questions": [
                {"id": nid(), "text": f"After watching this section, which is most accurate about {info['title']}?",
                 "type": "single", "options": ["It's a foundational concept tech recruiters should understand","It's irrelevant for recruiters","It's outdated","None of the above"],
                 "correct": ["It's a foundational concept tech recruiters should understand"], "marks": 1},
                {"id": nid(), "text": "Recruiters benefit from understanding the technical concepts behind the roles they hire for.",
                 "type": "truefalse", "options": ["True","False"], "correct": ["True"], "marks": 1},
            ],
            "created_at": now(),
        })
        print(f"✓ {info['title']} — {len(info['lessons'])} lessons, {round(total_min/60, 1)}h")

    total = sum(len(s["lessons"]) for s in SECTIONS.values())
    print(f"\n✅ {len(SECTIONS)} courses created with {total} lessons total.")

asyncio.run(run())
client.close()
