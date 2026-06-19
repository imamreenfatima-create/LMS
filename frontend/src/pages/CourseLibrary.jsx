import React, { useEffect, useState } from "react";
import { api, CATEGORIES } from "../lib/api";
import { Link, useSearchParams } from "react-router-dom";

export default function CourseLibrary() {
  const [courses, setCourses] = useState([]);
  const [filter, setFilter] = useState("");
  const [sp] = useSearchParams();
  const initQ = sp.get("q") || "";

  useEffect(() => {
    const params = filter ? `?category=${encodeURIComponent(filter)}` : "";
    api.get(`/courses${params}`).then(r => setCourses(r.data));
  }, [filter]);

  const filtered = initQ
    ? courses.filter(c => (c.title + c.description + c.category).toLowerCase().includes(initQ.toLowerCase()))
    : courses;

  return (
    <div className="space-y-6" data-testid="course-library">
      <div>
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-slate-500">Course Library</div>
        <h1 className="font-heading text-4xl font-bold mt-1">Explore all courses</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={()=>setFilter("")} data-testid="filter-all" className={`px-4 py-2 text-sm rounded-full border transition ${!filter ? "bg-[#0B1121] text-white border-[#0B1121]" : "bg-white border-slate-300 hover:border-slate-400"}`}>All</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={()=>setFilter(c)} data-testid={`filter-${c.toLowerCase().replace(/ /g,'-')}`} className={`px-4 py-2 text-sm rounded-full border transition ${filter===c ? "bg-[#0B1121] text-white border-[#0B1121]" : "bg-white border-slate-300 hover:border-slate-400"}`}>{c}</button>
        ))}
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map(c => (
          <Link key={c.id} to={`/app/course/${c.id}`} className="hg-card overflow-hidden group" data-testid={`library-card-${c.id}`}>
            <div className="h-36 bg-slate-100 overflow-hidden">
              <img src={c.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">{c.category}</div>
                {c.is_assigned && <span className="text-[10px] bg-rose-50 text-[#E11D48] px-2 py-0.5 rounded font-medium">ASSIGNED</span>}
              </div>
              <div className="font-heading font-semibold mt-1.5 line-clamp-2">{c.title}</div>
              <div className="text-xs text-slate-500 mt-2 flex gap-3 font-mono">
                <span>{c.module_count} modules</span>
                <span>{c.duration_hours}h</span>
                <span>{c.level}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && <div className="text-center text-slate-500 py-12">No courses found.</div>}
    </div>
  );
}
