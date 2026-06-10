// src/context/AuthContext.jsx — Phase 1 + Phase 4
// Phase 4: stores refresh_token, handles token pair on login

import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      api.get("/auth/me")
         .then(r => setUser(r.data))
         .catch(() => localStorage.clear())
         .finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, []);

  const login = async (email, password) => {
    // Phase 4: login returns { access_token, refresh_token, token_type }
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("access_token",  data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    const me = await api.get("/auth/me");
    setUser(me.data);
  };

  const logout = () => {
    const rt = localStorage.getItem("refresh_token");
    if (rt) api.post("/auth/logout", { refresh_token: rt }).catch(() => {});
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, ready }}>
      {ready ? children : null}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
