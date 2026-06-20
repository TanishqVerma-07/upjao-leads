import { createContext, useContext, useState, useCallback } from "react";
import { connectWS, disconnectWS } from "../ws";

const AuthContext = createContext(null);

const SESSION_KEY = "upjao_session";

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSession(token, user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }));
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// In-memory token for apiFetch — seeded from sessionStorage on first load
let _token = loadSession()?.token ?? null;

export function AuthProvider({ children }) {
  const saved = loadSession();
  const [user, setUser] = useState(saved?.user ?? null);

  // Reconnect WS on page load if session exists
  if (saved?.token) connectWS();

  const login = useCallback((tokenResponse) => {
    const u = { id: tokenResponse.user_id, name: tokenResponse.name, role: tokenResponse.role };
    _token = tokenResponse.access_token;
    saveSession(_token, u);
    setUser(u);
    connectWS();
  }, []);

  const logout = useCallback(() => {
    _token = null;
    clearSession();
    disconnectWS();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function getToken() {
  return _token;
}
