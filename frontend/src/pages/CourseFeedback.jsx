import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Star, X } from "lucide-react";
import { toast } from "sonner";

export default function CourseFeedback({ courseId, courseTitle, onClose }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState(null);

  useEffect(() => {
    api.get(`/learner/feedback/${courseId}`).then(r => {
      if (r.data?.rating) {
        setExisting(r.data);
        setRating(r.data.rating);
        setComment(r.data.comment || "");
      }
    }).catch(() => {});
  }, [courseId]);

  const submit = async () => {
    if (rating < 1) return toast.error("Please select a rating");
    setBusy(true);
    try {
      await api.post("/learner/feedback", { course_id: courseId, rating, comment });
      toast.success(existing ? "Feedback updated. Thank you!" : "Thanks for your feedback!");
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to submit");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" data-testid="feedback-modal">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="font-heading text-xl font-semibold">Rate this course</h3>
            <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[300px]">{courseTitle}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-center gap-2 py-4">
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                data-testid={`star-${i}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(i)}
                className="transition-transform hover:scale-110"
              >
                <Star className={`w-10 h-10 ${(hover || rating) >= i ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
              </button>
            ))}
          </div>
          <div className="text-center text-sm text-slate-600 -mt-2">
            {rating === 0 && "Tap a star to rate"}
            {rating === 1 && "Poor"}
            {rating === 2 && "Fair"}
            {rating === 3 && "Good"}
            {rating === 4 && "Very good"}
            {rating === 5 && "Excellent"}
          </div>
          <textarea
            data-testid="fb-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share what you liked or suggest improvements (optional)…"
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
          />
          <button data-testid="fb-submit" disabled={busy || rating === 0} onClick={submit} className="w-full hg-btn-primary py-2.5 disabled:opacity-50">
            {existing ? "Update feedback" : "Submit feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}
