import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { toast } from "sonner";
import {
  CheckCircle2, Play, FileText, Youtube, BookOpen, ClipboardCheck, FileQuestion,
  Sparkles, X, Download, Clock, ChevronDown, ChevronRight, Video, Presentation,
} from "lucide-react";

function absoluteUrl(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${process.env.REACT_APP_BACKEND_URL}${url}`;
}

function youtubeId(url) {
  const m = url?.match(/[?&]v=([^&]+)|youtu\.be\/([^?&]+)/);
  return m ? (m[1] || m[2]) : null;
}

// ---------- Lesson viewer (inline player) ----------
function LessonViewer({ lesson }) {
  const ct = lesson.content_type;
  const url = absoluteUrl(lesson.content_url);
  const [fileMissing, setFileMissing] = useState(false);

  useEffect(() => {
    setFileMissing(false);
    if (!url) return;
    if (!lesson.content_url?.startsWith("/api/files/")) return;
    fetch(url, { method: "HEAD" }).then(r => { if (!r.ok) setFileMissing(true); }).catch(() => setFileMissing(true));
  }, [url, lesson.content_url]);

  if (fileMissing) return (
    <div className="bg-rose-50 border border-rose-200 rounded p-6 text-center">
      <div className="font-heading font-semibold text-[#BE123C]">File not found</div>
      <p className="text-sm text-slate-700 mt-2">Please ask your trainer to re-upload this file.</p>
    </div>
  );
  if ((ct === "youtube" || ct === "video") && youtubeId(lesson.content_url))
    return <div className="aspect-video bg-black rounded overflow-hidden">
      <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${youtubeId(lesson.content_url)}`} allowFullScreen title={lesson.title} />
    </div>;
  if (ct === "video" && url)
    return <div className="aspect-video bg-black rounded overflow-hidden"><video className="w-full h-full" src={url} controls /></div>;
  if (ct === "pdf" && url)
    return <div className="bg-slate-100 rounded overflow-hidden" style={{height: "75vh"}}><iframe className="w-full h-full" src={url} title={lesson.title} /></div>;
  if (["ppt","doc"].includes(ct) && url) {
    const viewer = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    return (
      <div>
        <div className="bg-slate-100 rounded overflow-hidden" style={{height: "75vh"}}>
          <iframe className="w-full h-full" src={viewer} title={lesson.title} allowFullScreen />
        </div>
        <div className="text-[11px] text-slate-500 mt-2 text-center">If the preview is blank, use Download to open locally.</div>
      </div>
    );
  }
  if (ct === "notes" || lesson.text_content)
    return <div className="prose prose-slate max-w-none whitespace-pre-wrap text-sm leading-relaxed">{lesson.text_content || "No notes."}</div>;
  if (url) return <div className="bg-slate-100 rounded overflow-hidden" style={{height: "75vh"}}><iframe className="w-full h-full" src={url} title={lesson.title} /></div>;
  return <div className="text-slate-500 text-sm">No content available.</div>;
}

// ---------- Resource list row ----------
function ResourceRow({ lesson, done, onOpen }) {
  return (
    <button
      onClick={()=>onOpen(lesson)}
      data-testid={`lesson-${lesson.id}`}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-left hover:bg-slate-50 transition"
    >
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-[#10B981] text-white" : "bg-white border border-slate-300 text-slate-500"}`}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : <Play className="w-3 h-3 ml-0.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800 truncate">{lesson.title}</div>
        <div className="text-xs text-slate-500 font-mono mt-0.5">{lesson.duration_min}m</div>
      </div>
    </button>
  );
}

// ---------- Resource-type section ----------
function ResourceSection({ icon: Icon, label, lessons, completedSet, onOpen, accent }) {
  if (lessons.length === 0) return null;
  return (
    <div className="border border-slate-200 rounded-lg bg-white">
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
        <Icon className={`w-4 h-4 ${accent || "text-slate-600"}`} />
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-slate-500 font-mono ml-auto">{lessons.filter(l => completedSet.has(l.id)).length} / {lessons.length}</div>
      </div>
      <div className="divide-y divide-slate-100">
        {lessons.map(l => <ResourceRow key={l.id} lesson={l} done={completedSet.has(l.id)} onOpen={onOpen} />)}
      </div>
    </div>
  );
}

// ---------- Module accordion ----------
function ModuleAccordion({ module, idx, defaultOpen, completedSet, moduleQuizzes, passedQuizIds, onOpenLesson }) {
  const [open, setOpen] = useState(defaultOpen);
  const buckets = useMemo(() => ({
    videos:  module.lessons.filter(l => l.content_type === "video"),
    docs:    module.lessons.filter(l => l.content_type === "pdf" || l.content_type === "doc" || l.content_type === "notes"),
    ppts:    module.lessons.filter(l => l.content_type === "ppt"),
    youtube: module.lessons.filter(l => l.content_type === "youtube" || l.content_type === "link"),
  }), [module.lessons]);

  const total = module.lessons.length;
  const doneLessons = module.lessons.filter(l => completedSet.has(l.id)).length;
  const lessonsAllDone = total > 0 && doneLessons === total;
  const quizzesAllPassed = moduleQuizzes.length === 0 || moduleQuizzes.every(q => passedQuizIds.has(q.id));
  const moduleComplete = lessonsAllDone && quizzesAllPassed;
  // Progress = lesson progress weighted with quiz pass
  const denom = total + moduleQuizzes.length;
  const num = doneLessons + moduleQuizzes.filter(q => passedQuizIds.has(q.id)).length;
  const pct = denom ? Math.round((num / denom) * 100) : 0;

  return (
    <div className="hg-card overflow-hidden" data-testid={`module-${module.id}`}>
      <button
        onClick={()=>setOpen(!open)}
        data-testid={`module-toggle-${module.id}`}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition"
      >
        {open ? <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono uppercase text-slate-500 tracking-widest">Module {idx + 1}</div>
          <div className="font-heading text-lg font-semibold mt-0.5 truncate">{module.title}</div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 max-w-xs h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#E11D48] transition-all" style={{width: `${pct}%`}} />
            </div>
            <span className="text-xs font-mono text-slate-500">{num}/{denom}</span>
          </div>
        </div>
        {moduleComplete && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 flex-shrink-0" data-testid={`module-completed-${module.id}`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Module Completed
          </div>
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 space-y-3 bg-slate-50/30">
          <ResourceSection icon={Video} label="Video Lessons" lessons={buckets.videos} completedSet={completedSet} onOpen={onOpenLesson} accent="text-[#E11D48]" />
          <ResourceSection icon={FileText} label="Documents" lessons={buckets.docs} completedSet={completedSet} onOpen={onOpenLesson} accent="text-[#0B1121]" />
          <ResourceSection icon={Presentation} label="Presentations (PPT)" lessons={buckets.ppts} completedSet={completedSet} onOpen={onOpenLesson} accent="text-[#F59E0B]" />
          <ResourceSection icon={Youtube} label="YouTube Resources" lessons={buckets.youtube} completedSet={completedSet} onOpen={onOpenLesson} accent="text-[#FF0000]" />
          {moduleQuizzes.length > 0 && (
            <div className="border border-slate-200 rounded-lg bg-white">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                <ClipboardCheck className="w-4 h-4 text-[#E11D48]" />
                <div className="text-sm font-semibold">Assignment</div>
                <div className="text-xs text-slate-500 font-mono ml-auto">{moduleQuizzes.filter(q => passedQuizIds.has(q.id)).length} / {moduleQuizzes.length} passed</div>
              </div>
              <div className="p-3 space-y-2">
                {moduleQuizzes.map(q => {
                  const passed = passedQuizIds.has(q.id);
                  return (
                    <Link key={q.id} to={`/app/quiz/${q.id}`} data-testid={`assignment-link-${q.id}`} className={`block p-3 rounded border ${passed ? "bg-emerald-50/40 border-emerald-200" : "border-transparent hover:bg-slate-50 hover:border-slate-200"}`}>
                      <div className="flex items-center gap-2">
                        {passed ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <FileQuestion className="w-4 h-4 text-[#E11D48]" />}
                        <div className="flex-1">
                          <div className="text-sm font-medium">{q.title}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">{q.questions?.length || 0} MCQs · {q.duration_min} min · pass {q.pass_percent}%{passed ? " · ✓ Passed" : ""}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Main page ----------
export default function CourseDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [active, setActive] = useState(null);

  const load = () => api.get(`/courses/${id}`).then(r => setData(r.data));
  useEffect(() => { load(); }, [id]);

  // lesson view timer for time-based auto-complete (pdf/ppt/doc/notes)
  const [elapsed, setElapsed] = useState(0);
  const [autoDone, setAutoDone] = useState(false);
  useEffect(() => {
    setElapsed(0); setAutoDone(false);
    if (!active) return;
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [active?.id]);

  useEffect(() => {
    if (!active || autoDone || !data) return;
    if (!["pdf","ppt","doc","notes"].includes(active.content_type)) return;
    const done = new Set(data.completed_lessons || []);
    if (done.has(active.id)) return;
    const target = Math.max(30, Math.floor((active.duration_min || 5) * 60 * 0.8));
    if (elapsed >= target) {
      setAutoDone(true);
      api.post("/learner/progress", { lesson_id: active.id }).then(() => {
        toast.success("Auto-completed (+10 pts)"); load();
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, active, data, autoDone]);

  if (!data) return <div className="text-slate-500">Loading…</div>;
  const { course, modules, quizzes, progress_pct, completed_lessons, passed_quiz_ids } = data;
  const completedSet = new Set(completed_lessons);
  const passedQuizIds = new Set(passed_quiz_ids || []);
  const quizzesByModule = (modules || []).reduce((acc, m) => {
    acc[m.id] = (quizzes || []).filter(q => q.module_id === m.id);
    return acc;
  }, {});

  const markComplete = async () => {
    if (!active) return;
    await api.post("/learner/progress", { lesson_id: active.id });
    toast.success("Lesson completed (+10 pts)");
    load();
  };

  return (
    <div className="space-y-6" data-testid="course-detail">
      <Link to="/app/library" className="text-xs font-mono uppercase tracking-widest text-slate-500 hover:text-[#E11D48]">← Back to library</Link>
      <div>
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#E11D48]">{course.category}</div>
        <h1 className="font-heading text-4xl font-bold mt-1">{course.title}</h1>
        <p className="text-slate-600 mt-3 max-w-3xl">{course.description}</p>
        <div className="flex gap-4 text-sm text-slate-600 mt-4 font-mono">
          <span>{course.duration_hours}h</span><span>·</span>
          <span>{course.level}</span><span>·</span>
          <span>{modules.length} modules</span>
        </div>
        <div className="mt-5 max-w-xl">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
            <span>Course progress</span><span className="font-mono">{progress_pct}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#E11D48] transition-all" style={{width: `${progress_pct}%`}} />
          </div>
        </div>
      </div>

      {active && (
        <div className="hg-card p-6">
          <div className="flex items-start justify-between mb-4 gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-mono uppercase text-slate-500 tracking-widest">Now playing</div>
              <div className="font-heading text-xl font-semibold mt-1">{active.title}</div>
            </div>
            <div className="flex items-center gap-2">
              {active.content_url && active.content_type !== "notes" && (
                <a href={absoluteUrl(active.content_url)} target="_blank" rel="noreferrer" download
                   data-testid="download-lesson-btn"
                   className="px-3 py-1.5 border border-slate-300 rounded-sm text-xs flex items-center gap-1.5 hover:bg-slate-50">
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              )}
              <button data-testid="close-lesson-btn" onClick={()=>setActive(null)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
            </div>
          </div>
          <LessonViewer lesson={active} />
          {!completedSet.has(active.id) && (
            <div className="mt-4 flex gap-2">
              <button data-testid="mark-complete-btn" onClick={markComplete} className="hg-btn-primary text-sm">
                <CheckCircle2 className="inline w-4 h-4 mr-1" /> Mark as complete
              </button>
            </div>
          )}
          {completedSet.has(active.id) && (
            <div className="mt-4 p-2.5 bg-emerald-50 border border-emerald-200 rounded flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="w-4 h-4" /> Completed
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {modules.map((m, i) => (
          <ModuleAccordion
            key={m.id}
            module={m}
            idx={i}
            defaultOpen={i === 0}
            completedSet={completedSet}
            moduleQuizzes={quizzesByModule[m.id] || []}
            passedQuizIds={passedQuizIds}
            onOpenLesson={setActive}
          />
        ))}
      </div>
    </div>
  );
}
