import { createContext, useContext, useEffect, useState } from "react";
import api from "../utils/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("fixmoto_user") || "null"); }
    catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  const saveSession = (data) => {
    setUser(data.user);
    localStorage.setItem("fixmoto_user", JSON.stringify(data.user));
    localStorage.setItem("fixmoto_token", data.token);
  };

  const login = async (credentials) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", credentials);
      saveSession(data);
      return data;
    } finally { setLoading(false); }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", payload);
      saveSession(data);
      return data;
    } finally { setLoading(false); }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("fixmoto_user");
    localStorage.removeItem("fixmoto_token");
  };

  useEffect(() => {
    const token = localStorage.getItem("fixmoto_token");
    if (!token) { setLoading(false); return; }
    api.get("/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem("fixmoto_user", JSON.stringify(data.user));
      })
      .catch(logout)
      .finally(() => setLoading(false));
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
