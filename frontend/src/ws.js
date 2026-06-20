import { getToken } from "./context/AuthContext";

// Derive ws(s):// from VITE_API_URL so prod (https + wss) and local dev (http + ws)
// both work without separate config.
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const WS_BASE = API_BASE.replace(/^http/, "ws") + "/ws";

let _ws = null;
let _reconnectTimer = null;
const _listeners = new Set();

function dispatch(event) {
  _listeners.forEach(cb => {
    try { cb(event); } catch {}
  });
}

function connect() {
  const token = getToken();
  if (!token) return;
  if (_ws && (_ws.readyState === WebSocket.CONNECTING || _ws.readyState === WebSocket.OPEN)) return;

  _ws = new WebSocket(`${WS_BASE}?token=${token}`);

  _ws.onopen = () => {
    if (_reconnectTimer) { clearInterval(_reconnectTimer); _reconnectTimer = null; }
  };

  _ws.onmessage = (e) => {
    try { dispatch(JSON.parse(e.data)); } catch {}
  };

  _ws.onclose = () => {
    _ws = null;
    // Reconnect after 2s — getToken() will be re-checked then
    _reconnectTimer = setTimeout(connect, 2000);
  };

  _ws.onerror = () => _ws?.close();
}

export function connectWS() {
  connect();
}

export function disconnectWS() {
  if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
  _ws?.close();
  _ws = null;
}

/** Subscribe to WebSocket events. Returns an unsubscribe function. */
export function addWSListener(cb) {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}
