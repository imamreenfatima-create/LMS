import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { toast } from "sonner";
import { CheckCircle2, Play, FileText, Youtube, Link as LinkIcon, BookOpen, ClipboardCheck, FileQuestion, Sparkles, X, Download, Clock } from "lucide-react";

function absoluteUrl(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${process.env.REACT_APP_BACKEND_URL}${url}`;
}

function LessonViewer({ lesson }) {
  const ct = lesson.content_type;
  const url = absoluteUrl(lesson.content_url);

  // YouTube/video URL → embed player
  if ((ct === "youtube" || ct === "video") && youtubeId(lesson.content_url)) {
    return (
      <div className="aspect-video bg-black rounded overflow-hidden">
        <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${youtubeId(lesson.content_url)}`} allowFullScreen title={lesson.title} />
      </div>
    );
  }
  // Native MP4 / video file
  if (ct === "video" && url) {
    return (
      <div className="aspect-video bg-black rounded overflow-hidden">
        <video className="w-full h-full" src={url} controls />
      </div>
    );
  }
  // PDF — render in iframe (browsers display PDFs natively)
  if (ct === "pdf" && url) {
    return (
      <div className="bg-slate-100 rounded overflow-hidden" style={{height: "75vh"}}>
        <iframe className="w-full h-full" src={url} title={lesson.title} />
      </div>
    );
  }
  // PPT / DOC / DOCX / XLSX — use Microsoft Office Online viewer
  if (["ppt","doc"].includes(ct) && url) {
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    return (
      <div className="bg-slate-100 rounded overflow-hidden" style={{height: "75vh"}}>
        <iframe className="w-full h-full" src={viewerUrl} title={lesson.title} allowFullScreen />
        <div className="text-[11px] text-slate-500 mt-2 text-center">Powered by Office Online · If preview doesn't load, use Download.</div>
      </div>
    );
  }
  // Notes / text content
  if (ct === "notes" || lesson.text_content) {
    return <div className="prose prose-slate max-w-none whitespace-pre-wrap text-sm leading-relaxed">{lesson.text_content || "No notes available."}</div>;
  }
  // External link fallback
  if (url) {
    return (
      <div className="bg-slate-100 rounded overflow-hidden" style={{height: "75vh"}}>
        <iframe className="w-full h-full" src={url} title={lesson.title} />
      </div>
    );
  }
  return <div className="text-slate-500 text-sm">No content available.</div>;
}

function getIcon(ct) {
  if (ct === "video" || ct === "youtube") return Youtube;
  if (ct === "pdf" || ct === "ppt" || ct === "doc") return FileText;
  if (ct === "notes") return BookOpen;
  return LinkIcon;
}

function youtubeId(url) {
  const m = url?.match(/[?&]v=([^&]+)|youtu\.be\/([^?&]+)/);
  return m ? (m[1] || m[2]) : null;
}

export default function CourseDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [active, setActive] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [autoCompleted, setAutoCompleted] = useState(false);

  const load = () => api.get(`/courses/${id}`).then(r => setData(r.data));
  useEffect(() => { load(); }, [id]);

  // Reset timer whenever a new lesson is opened
  useEffect(() => {
    setElapsed(0); setAutoCompleted(false);
    if (!active) return;
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [active?.id]);

  // Auto-complete time-based lessons (PPT/DOC/PDF/notes) once the learner has spent the expected duration
  useEffect(() => {
    if (!active || autoCompleted || !data) return;
    const isTimed = ["pdf","ppt","doc","notes"].includes(active.content_type);
    if (!isTimed) return;
    const done = new Set(data.completed_lessons || []);
    if (done.has(active.id)) return;
    const target = Math.max(30, Math.floor((active.duration_min || 5) * 60 * 0.8));
    if (elapsed >= target) {
      setAutoCompleted(true);
      api.post("/learner/progress", { lesson_id: active.id }).then(() => {
        toast.success("Auto-completed: you've reached the expected duration (+10 pts).");
        load();
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, active, data, autoCompleted]);

  if (!data) return <div className="text-slate-500">Loading…</div>;
  const { course, modules, quizzes, assignments, completed_lessons, progress_pct } = data;
  const completedSet = new Set(completed_lessons);

  const markComplete = async (lesson) => {
    await api.post("/learner/progress", { lesson_id: lesson.id });
    toast.success("Lesson completed (+10 pts)");
    load();
  };


  const summarize = async (lesson) => {
    setSummaryOpen(true); setSummary(""); setSummaryLoading(true);
    try {
      const text = lesson.text_content || `${lesson.title} — content URL: ${lesson.content_url}`;
      const { data } = await api.post("/ai/summarize", { text });
      setSummary(data.summary);
    } catch { toast.error("AI summary failed"); }
    finally { setSummaryLoading(false); }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-8" data-testid="course-detail">
      <div className="space-y-6">
        <Link to="/app/library" className="text-xs font-mono uppercase tracking-widest text-slate-500 hover:text-[#E11D48]">← Course library</Link>
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-[#E11D48]">{course.category}</div>
          <h1 className="font-heading text-4xl font-bold mt-1">{course.title}</h1>
          <p className="text-slate-600 mt-3 max-w-3xl">{course.description}</p>
          <div className="flex gap-4 text-sm text-slate-600 mt-4 font-mono">
            <span>{course.duration_hours} hours</span><span>·</span>
            <span>{course.level}</span><span>·</span>
            <span>{modules.length} modules</span>
          </div>
          <div className="mt-5 max-w-md">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5"><span>Your progress</span><span className="font-mono">{progress_pct}%</span></div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-[#E11D48]" style={{width: `${progress_pct}%`}} /></div>
          </div>
        </div>

        {active && (
          <div className="hg-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-500 tracking-widest">Now playing</div>
                <div className="font-heading text-xl font-semibold mt-1">{active.title}</div>
              </div>
              <div className="flex items-center gap-2">
                {active.content_url && !["notes"].includes(active.content_type) && (
                  <a href={active.content_url.startsWith("http") ? active.content_url : `${process.env.REACT_APP_BACKEND_URL}${active.content_url}`}
                     download
                     target="_blank" rel="noreferrer"
                     data-testid="download-lesson-btn"
                     className="px-3 py-1.5 border border-slate-300 rounded-sm text-xs flex items-center gap-1.5 hover:bg-slate-50">
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                )}
                <button data-testid="close-lesson-btn" onClick={()=>setActive(null)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <LessonViewer lesson={active} />
            {/* Time-tracking strip for presentation/document lessons */}
            {["pdf","ppt","doc","notes"].includes(active.content_type) && !completedSet.has(active.id) && (() => {
              const target = Math.max(30, Math.floor((active.duration_min || 5) * 60 * 0.8));
              const pct = Math.min(100, Math.round((elapsed / target) * 100));
              const mm = String(Math.floor(elapsed/60)).padStart(2,'0');
              const ss = String(elapsed%60).padStart(2,'0');
              return (
                <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded" data-testid="lesson-timer">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-[#E11D48]" />
                      <span className="font-mono">{mm}:{ss}</span>
                      <span className="text-slate-400">of ~{Math.floor(target/60)}:{String(target%60).padStart(2,'0')} expected</span>
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{pct < 100 ? "Engaged" : "Ready to complete"}</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#E11D48] transition-all duration-500" style={{width: `${pct}%`}} />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1.5">This lesson will be auto-completed once you reach the expected duration.</div>
                </div>
              );
            })()}
            {completedSet.has(active.id) && (
              <div className="mt-4 p-2.5 bg-emerald-50 border border-emerald-200 rounded flex items-center gap-2 text-sm text-emerald-700" data-testid="lesson-done-badge">
                <CheckCircle2 className="w-4 h-4" /> Completed
              </div>
            )}
            <div className="mt-4 flex gap-2">
              {!completedSet.has(active.id) && (
                <button data-testid="mark-complete-btn" onClick={()=>markComplete(active)} className="hg-btn-primary text-sm">Mark as complete</button>
              )}
              <button data-testid="ai-summarize-btn" onClick={()=>summarize(active)} className="px-4 py-2 border border-slate-300 rounded-sm text-sm flex items-center gap-2 hover:bg-slate-50">
                <Sparkles className="w-3.5 h-3.5 text-[#E11D48]" /> AI Summarize
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {modules.map((m, mi) => (
            <div key={m.id} className="hg-card overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <div className="text-[10px] font-mono uppercase text-slate-500">Module {mi+1}</div>
                <div className="font-heading text-lg font-semibold mt-1">{m.title}</div>
              </div>
              <div className="divide-y divide-slate-100">
                {m.lessons.map(l => {
                  const Icon = getIcon(l.content_type);
                  const done = completedSet.has(l.id);
                  return (
                    <button key={l.id} onClick={()=>setActive(l)} data-testid={`lesson-${l.id}`} className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${done ? "bg-[#10B981] text-white" : "bg-slate-100 text-slate-600"}`}>
                        {done ? <CheckCircle2 className="w-4 h-4" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{l.title}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                          <Icon className="w-3 h-3" /> {l.content_type.toUpperCase()} · {l.duration_min}m
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="space-y-5">
        {quizzes.length > 0 && (
          <div className="hg-card p-5">
            <div className="flex items-center gap-2 mb-3"><FileQuestion className="w-4 h-4 text-[#E11D48]" /><div className="font-heading font-semibold">Quizzes</div></div>
            {quizzes.map(q => (
              <Link key={q.id} to={`/app/quiz/${q.id}`} data-testid={`quiz-link-${q.id}`} className="block p-3 -mx-2 rounded hover:bg-slate-50">
                <div className="text-sm font-medium">{q.title}</div>
                <div className="text-xs text-slate-500 font-mono mt-1">{q.duration_min} min · pass {q.pass_percent}%</div>
              </Link>
            ))}
          </div>
        )}
        {assignments.length > 0 && (
          <div className="hg-card p-5">
            <div className="flex items-center gap-2 mb-3"><ClipboardCheck className="w-4 h-4 text-[#E11D48]" /><div className="font-heading font-semibold">Assignments</div></div>
            {assignments.map(a => (
              <Link key={a.id} to={`/app/assignment/${a.id}`} data-testid={`assignment-link-${a.id}`} className="block p-3 -mx-2 rounded hover:bg-slate-50">
                <div className="text-sm font-medium">{a.title}</div>
                <div className="text-xs text-slate-500 mt-1 line-clamp-2">{a.description}</div>
              </Link>
            ))}
          </div>
        )}
      </aside>

      {summaryOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={()=>setSummaryOpen(false)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-heading text-xl font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-[#E11D48]" /> AI Summary</div>
              <button onClick={()=>setSummaryOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            {summaryLoading ? <div className="text-slate-500">Generating…</div> : <div className="prose prose-slate max-w-none whitespace-pre-wrap text-sm">{summary}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
