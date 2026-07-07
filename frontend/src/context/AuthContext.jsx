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

// Read the `exp` (seconds since epoch) claim out of a JWT without verifying it —
// used only to schedule a proactive client-side logout when the token lapses.
function tokenExpiryMs(token) {
  try {
    let b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";                 // restore base64 padding
    const payload = JSON.parse(atob(b64));
    return payload.exp ? payload.exp * 1000 : null;
  } catch { return null; }
}

function fireExpired() {
  window.dispatchEvent(new Event("upjao:session-expired"));
}

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

  // When apiFetch sees a 401 on an authenticated request, it fires this event —
  // clear the session so ProtectedRoute bounces the user to /login (which shows
  // a "session expired" notice) instead of leaving them on a broken screen.
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

  // Proactive logout: even if the user is idle (no requests), schedule a logout
  // for the exact moment the token's `exp` passes, so an expired session never
  // sits open. Re-runs whenever the logged-in user changes.
  useEffect(() => {
    if (!user || !_token) return;
    const exp = tokenExpiryMs(_token);
    if (!exp) return;
    const ms = exp - Date.now();
    if (ms <= 0) { fireExpired(); return; }
    const timer = setTimeout(fireExpired, ms);
    return () => clearTimeout(timer);
  }, [user]);

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
