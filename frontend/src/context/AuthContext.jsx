import { createContext, useContext, useState, useCallback, useEffect } from "react";
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

  // Safety net only: if the server ever rejects our token (a genuine auth
  // failure — not normal expiry, since tokens are long-lived), clear the broken
  // session so the user can sign in again instead of being stuck on an errored
  // screen. This does NOT fire during normal use.
  useEffect(() => {
    function onExpired() {
      _token = null;
      clearSession();
      disconnectWS();
      setUser(null);
      try { sessionStorage.setItem("upjao_expired", "1"); } catch { /* ignore */ }
    }
    window.addEventListener("upjao:session-expired", onExpired);
    return () => window.removeEventListener("upjao:session-expired", onExpired);
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
