import React, { useState } from "react";
import { api } from "../lib/api";
import { MessageSquareText, Send, X, Loader2, Sparkles } from "lucide-react";

export default function AiChatbot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ from: "ai", text: "Hi! I'm Genie, your learning assistant. Ask me anything about recruitment, courses, or concepts." }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sid, setSid] = useState(null);

  const send = async () => {
    if (!input.trim() || busy) return;
    const userMsg = input.trim();
    setMsgs([...msgs, { from: "user", text: userMsg }]);
    setInput(""); setBusy(true);
    try {
      const { data } = await api.post("/ai/chat", { message: userMsg, session_id: sid });
      setSid(data.session_id);
      setMsgs(m => [...m, { from: "ai", text: data.answer }]);
    } catch { setMsgs(m => [...m, { from: "ai", text: "Sorry, I couldn't reach the AI right now." }]); }
    finally { setBusy(false); }
  };

  return (
    <>
      <button data-testid="ai-chat-toggle" onClick={()=>setOpen(!open)} className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#E11D48] text-white shadow-lg hover:bg-[#BE123C] flex items-center justify-center z-40">
        {open ? <X className="w-5 h-5" /> : <MessageSquareText className="w-5 h-5" />}
      </button>
      {open && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-2rem)] h-[520px] bg-white rounded-lg shadow-2xl border border-slate-200 flex flex-col z-40" data-testid="ai-chatbot">
          <div className="p-4 border-b border-slate-200 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#0B1121] flex items-center justify-center"><Sparkles className="w-4 h-4 text-[#E11D48]" /></div>
            <div>
              <div className="font-heading font-semibold text-sm">Genie</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Your AI learning assistant</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.from==='user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${m.from==='user' ? 'bg-[#0B1121] text-white' : 'bg-slate-100 text-slate-800'}`}>{m.text}</div>
              </div>
            ))}
            {busy && <div className="flex justify-start"><div className="bg-slate-100 px-3 py-2 rounded-lg"><Loader2 className="w-4 h-4 animate-spin text-slate-500" /></div></div>}
          </div>
          <div className="p-3 border-t border-slate-200 flex gap-2">
            <input data-testid="ai-input" value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>e.key==='Enter' && send()} placeholder="Ask about recruitment…" className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm" />
            <button data-testid="ai-send" onClick={send} disabled={busy} className="hg-btn-primary px-3"><Send className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </>
  );
}
