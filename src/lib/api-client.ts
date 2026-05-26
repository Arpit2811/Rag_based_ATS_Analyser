import type { ChatMessage } from "./types";

const API_URL_KEY = "ats-api-url";

export function getApiUrl(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(API_URL_KEY) ?? "";
}

export function setApiUrl(url: string) {
  localStorage.setItem(API_URL_KEY, url.replace(/\/$/, ""));
}

function ensureUrl(): string {
  const url = getApiUrl();
  if (!url) throw new Error("API URL is not configured. Go to Settings and set your backend URL.");
  return url;
}

export async function ingestSession(sid: string, resume: File, jd: File) {
  const form = new FormData();
  form.append("resume", resume);
  form.append("jd", jd);
  const res = await fetch(`${ensureUrl()}/sessions/${sid}/ingest`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: true; chunks: number; session_id: string }>;
}

export async function analyzeSession(sid: string) {
  const res = await fetch(`${ensureUrl()}/sessions/${sid}/analyze`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ analysis: string }>;
}

export async function chatSession(sid: string, message: string, history: ChatMessage[]) {
  const res = await fetch(`${ensureUrl()}/sessions/${sid}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      history: history.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ answer: string }>;
}

export async function deleteRemoteSession(sid: string) {
  const url = getApiUrl();
  if (!url) return;
  try {
    await fetch(`${url}/sessions/${sid}`, { method: "DELETE" });
  } catch {
    /* ignore — local delete still proceeds */
  }
}
