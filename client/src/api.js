const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

/** WebSocket URL for the chat stream (same host as API, path /ws). */
export function getWsUrl() {
  const base = API_BASE;
  if (base) {
    const withProto = base.startsWith("http") ? base : `https://${base}`;
    const u = new URL(withProto);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = "/ws";
    u.search = "";
    u.hash = "";
    return u.toString();
  }
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws`;
}

export async function fetchMessages(roomId, limit = 100) {
  const q = new URLSearchParams({ roomId, limit: String(limit) });
  const res = await fetch(apiUrl(`/api/messages?${q}`));
  if (!res.ok) throw new Error(`Failed to load messages (${res.status})`);
  const data = await res.json();
  return data.messages ?? [];
}
