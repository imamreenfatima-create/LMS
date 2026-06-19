import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("hg_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && !window.location.pathname.startsWith("/login")) {
      localStorage.removeItem("hg_token");
      localStorage.removeItem("hg_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const LOGO_URL = "https://customer-assets.emergentagent.com/job_9ac1aa54-9b53-4535-860a-351528709aec/artifacts/ve82pcgn_logo.png";

export const CATEGORIES = [
  "Recruitment Basics",
  "Technical Recruitment",
  "Non-Technical Recruitment",
  "BFSI Recruitment",
  "Volume Hiring",
  "Advanced Recruitment",
];
