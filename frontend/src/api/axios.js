// src/api/axios.js — Phase 1 + Phase 4
// Phase 4: automatic token refresh on 401, 429 rate limit handling

import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

// ── Request: attach access token ─────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response: auto-refresh on 401, handle 429 ────────────────
let isRefreshing = false;
let pendingQueue = [];

const processPending = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token));
  pendingQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const orig = error.config;

    // Phase 4: rate limit handling
    if (error.response?.status === 429) {
      const retry = error.response.headers["retry-after"] || 60;
      return Promise.reject(new Error(`Too many requests. Please wait ${retry}s.`));
    }

    // Phase 4: auto-refresh on 401
    if (error.response?.status === 401 && !orig._retry &&
        !orig.url?.includes("/auth/login") &&
        !orig.url?.includes("/auth/refresh")) {

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then(token => {
          orig.headers.Authorization = `Bearer ${token}`;
          return api(orig);
        });
      }

      orig._retry   = true;
      isRefreshing  = true;
      const rt      = localStorage.getItem("refresh_token");

      if (!rt) {
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(
          "http://localhost:8000/auth/refresh",
          { refresh_token: rt }
        );
        localStorage.setItem("access_token",  data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        api.defaults.headers.common.Authorization = `Bearer ${data.access_token}`;
        orig.headers.Authorization = `Bearer ${data.access_token}`;
        processPending(null, data.access_token);
        return api(orig);
      } catch (refreshError) {
        processPending(refreshError, null);
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
