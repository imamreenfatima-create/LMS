import React from "react";
import "./index.css";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { Toaster } from "sonner";

import Login from "./pages/Login";
import FirstLogin from "./pages/FirstLogin";
import AppShell from "./pages/AppShell";
import LearnerDashboard from "./pages/LearnerDashboard";
import CourseLibrary from "./pages/CourseLibrary";
import CourseDetail from "./pages/CourseDetail";
import QuizAttempt from "./pages/QuizAttempt";
import AssignmentSubmit from "./pages/AssignmentSubmit";
import Certificates from "./pages/Certificates";
import Leaderboard from "./pages/Leaderboard";
import MyAssignments from "./pages/MyAssignments";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminCourses from "./pages/AdminCourses";
import AdminSubmissions from "./pages/AdminSubmissions";
import CourseEditor from "./pages/CourseEditor";

function Protected({ roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/first-login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={user.role === "learner" ? "/app/dashboard" : "/admin/dashboard"} replace />;
  return <Outlet />;
}

function Root() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "learner" ? "/app/dashboard" : "/admin/dashboard"} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/login" element={<Login />} />
          <Route path="/first-login" element={<FirstLogin />} />

          <Route element={<Protected roles={["learner","admin","trainer"]} />}>
            <Route element={<AppShell />}>
              <Route path="/app/dashboard" element={<LearnerDashboard />} />
              <Route path="/app/library" element={<CourseLibrary />} />
              <Route path="/app/course/:id" element={<CourseDetail />} />
              <Route path="/app/quiz/:id" element={<QuizAttempt />} />
              <Route path="/app/assignment/:id" element={<AssignmentSubmit />} />
              <Route path="/app/assignments" element={<MyAssignments />} />
              <Route path="/app/certificates" element={<Certificates />} />
              <Route path="/app/leaderboard" element={<Leaderboard />} />
              <Route path="/app/search" element={<CourseLibrary />} />
            </Route>
          </Route>

          <Route element={<Protected roles={["admin","trainer"]} />}>
            <Route element={<AppShell />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/courses" element={<AdminCourses />} />
              <Route path="/admin/course/:id/edit" element={<CourseEditor />} />
              <Route path="/admin/submissions" element={<AdminSubmissions />} />
              <Route path="/admin/leaderboard" element={<Leaderboard />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
