import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("hg_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("hg_token");
    if (!token) { setLoading(false); return; }
    api.get("/auth/me")
      .then((r) => { setUser(r.data); localStorage.setItem("hg_user", JSON.stringify(r.data)); })
      .catch(() => { localStorage.removeItem("hg_token"); localStorage.removeItem("hg_user"); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (login_id, password) => {
    const { data } = await api.post("/auth/login", { login_id, password });
    localStorage.setItem("hg_token", data.token);
    localStorage.setItem("hg_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("hg_token");
    localStorage.removeItem("hg_user");
    setUser(null);
    window.location.href = "/login";
  };

  const refresh = async () => {
    const { data } = await api.get("/auth/me");
    setUser(data);
    localStorage.setItem("hg_user", JSON.stringify(data));
  };

  return <AuthCtx.Provider value={{ user, login, logout, refresh, loading }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
