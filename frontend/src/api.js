import { getToken } from "./context/AuthContext";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Broadcast that our session is no longer valid so AuthProvider can log out
// and bounce the user to /login instead of leaving them on a broken screen.
function notifySessionExpired() {
  try { sessionStorage.setItem("upjao_expired", "1"); } catch { /* ignore */ }
  window.dispatchEvent(new Event("upjao:session-expired"));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// fetch that survives free-tier cold starts: a network failure (server waking
// up) is retried a couple of times with backoff before giving up.
async function fetchWithRetry(url, init, retries = 2) {
  try {
    return await fetch(url, init);
  } catch (e) {
    if (retries <= 0) {
      throw new Error("Can't reach the server. It may be waking up — try again in a moment.");
    }
    await sleep(2500);
    return fetchWithRetry(url, init, retries - 1);
  }
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetchWithRetry(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    // A 401 while we were holding a token means the session expired/was revoked
    // (not a wrong-password login, which carries no token). Log the user out.
    if (res.status === 401 && token) notifySessionExpired();
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw Object.assign(new Error(err.detail || "Request failed"), { status: res.status });
  }
  return res.status === 204 ? null : res.json();
}

/** Upload a file via multipart/form-data. `extra` is key→value form fields. */
export async function apiUpload(path, file, extra = {}) {
  const token = getToken();
  const fd = new FormData();
  fd.append("file", file);
  for (const [k, v] of Object.entries(extra)) fd.append(k, v);

  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  if (!res.ok) {
    if (res.status === 401 && token) notifySessionExpired();
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw Object.assign(new Error(err.detail || "Upload failed"), { status: res.status });
  }
  return res.json();
}

/** Fetch a binary file and trigger a browser download. */
export async function downloadFile(attachmentId, fileName) {
  const token = getToken();
  const res = await fetch(`${BASE}/attachments/${attachmentId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    if (res.status === 401 && token) notifySessionExpired();
    throw new Error("Download failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
