import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Clock, CheckCircle2, XCircle } from "lucide-react";

export default function QuizAttempt() {
  const { id } = useParams();
  const nav = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [started, setStarted] = useState(false);

  useEffect(() => { api.get(`/learner/quiz/${id}`).then(r => { setQuiz(r.data); setTimeLeft(r.data.duration_min * 60); }); }, [id]);

  useEffect(() => {
    if (!started || result) return;
    const t = setInterval(() => setTimeLeft(s => {
      if (s <= 1) { clearInterval(t); submit(); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [started, result]);

  if (!quiz) return <div className="text-slate-500">Loading…</div>;

  const setSingle = (qid, opt) => setAnswers({ ...answers, [qid]: [opt] });
  const toggleMulti = (qid, opt) => {
    const cur = answers[qid] || [];
    setAnswers({ ...answers, [qid]: cur.includes(opt) ? cur.filter(o => o !== opt) : [...cur, opt] });
  };
  const setFill = (qid, val) => setAnswers({ ...answers, [qid]: [val] });

  const submit = async () => {
    try {
      const { data } = await api.post("/learner/quiz/submit", { quiz_id: id, answers, time_taken_sec: quiz.duration_min*60 - timeLeft });
      setResult(data);
      if (data.passed) toast.success(`Passed! Score: ${data.pct}%`); else toast.error(`Score: ${data.pct}% — try again`);
    } catch { toast.error("Submission failed"); }
  };

  const mm = String(Math.floor(timeLeft/60)).padStart(2,'0');
  const ss = String(timeLeft%60).padStart(2,'0');

  if (result) {
    return (
      <div className="max-w-2xl mx-auto" data-testid="quiz-result">
        <div className="hg-card p-8 text-center">
          {result.passed ? <CheckCircle2 className="w-16 h-16 text-[#10B981] mx-auto" /> : <XCircle className="w-16 h-16 text-[#EF4444] mx-auto" />}
          <h1 className="font-heading text-3xl font-bold mt-4">{result.passed ? "Passed!" : "Not passed yet"}</h1>
          <div className="text-6xl font-heading font-bold mt-6 text-[#E11D48]">{result.pct}%</div>
          <div className="text-slate-600 mt-2">{result.score} / {result.total} marks</div>
          <button onClick={()=>nav(-1)} className="hg-btn-primary mt-8">Back to course</button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="max-w-2xl mx-auto hg-card p-8 text-center" data-testid="quiz-intro">
        <h1 className="font-heading text-3xl font-bold">{quiz.title}</h1>
        <p className="text-slate-600 mt-3">{quiz.description}</p>
        <div className="grid grid-cols-3 gap-4 my-6 text-sm">
          <div><div className="text-[10px] font-mono uppercase text-slate-500">Duration</div><div className="font-semibold text-lg">{quiz.duration_min}m</div></div>
          <div><div className="text-[10px] font-mono uppercase text-slate-500">Questions</div><div className="font-semibold text-lg">{quiz.questions.length}</div></div>
          <div><div className="text-[10px] font-mono uppercase text-slate-500">Pass mark</div><div className="font-semibold text-lg">{quiz.pass_percent}%</div></div>
        </div>
        <button data-testid="start-quiz-btn" onClick={()=>setStarted(true)} className="hg-btn-primary px-8 py-3">Start quiz</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="quiz-attempt">
      <div className="flex items-center justify-between sticky top-0 bg-[#F8FAFC] py-3 z-10">
        <div>
          <div className="text-[10px] font-mono uppercase text-slate-500 tracking-widest">Quiz in progress</div>
          <h1 className="font-heading text-2xl font-bold">{quiz.title}</h1>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded font-mono text-lg ${timeLeft < 60 ? "bg-rose-50 text-[#E11D48]" : "bg-slate-100"}`}>
          <Clock className="w-4 h-4" /> {mm}:{ss}
        </div>
      </div>
      {quiz.questions.map((q, i) => (
        <div key={q.id} className="hg-card p-6" data-testid={`question-${i}`}>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-sm text-slate-500">Q{i+1}.</span>
            <div className="flex-1">
              <div className="font-medium">{q.text}</div>
              <div className="text-[10px] font-mono uppercase text-slate-400 mt-1 tracking-widest">{q.type}{q.marks > 1 ? ` · ${q.marks} marks` : ""}</div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {q.type === "fill" ? (
              <input data-testid={`fill-${q.id}`} value={(answers[q.id]||[""])[0]} onChange={(e)=>setFill(q.id, e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded" placeholder="Your answer" />
            ) : q.options.map(opt => {
              const sel = (answers[q.id]||[]).includes(opt);
              const multi = q.type === "multiple";
              return (
                <button key={opt} data-testid={`opt-${q.id}-${opt}`}
                  onClick={()=> multi ? toggleMulti(q.id, opt) : setSingle(q.id, opt)}
                  className={`w-full text-left px-4 py-2.5 rounded border text-sm transition ${sel ? "border-[#E11D48] bg-rose-50" : "border-slate-200 hover:border-slate-400"}`}>
                  <span className="inline-block w-5 h-5 mr-3 rounded-full border-2 align-middle text-center text-xs leading-4 font-mono"
                        style={{borderColor: sel ? "#E11D48" : "#CBD5E1", background: sel ? "#E11D48" : "transparent", color: sel ? "white" : "transparent"}}>✓</span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <button data-testid="submit-quiz-btn" onClick={submit} className="hg-btn-primary w-full py-3">Submit quiz</button>
    </div>
  );
}
