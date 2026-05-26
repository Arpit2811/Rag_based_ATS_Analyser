import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatMessage, Session, SessionAnalysis, SessionFileMeta } from "./types";

interface State {
  sessions: Session[];
  activeId: string | null;
  createSession: (name?: string) => Session;
  deleteSession: (id: string) => void;
  renameSession: (id: string, name: string) => void;
  duplicateSession: (id: string) => Session | null;
  setActive: (id: string | null) => void;
  patch: (id: string, patch: Partial<Session>) => void;
  setFiles: (id: string, resume: SessionFileMeta, jd: SessionFileMeta) => void;
  setAnalysis: (id: string, a: SessionAnalysis) => void;
  appendChat: (id: string, msg: ChatMessage) => void;
}

const newSession = (name?: string): Session => ({
  id: crypto.randomUUID(),
  name: name ?? "Untitled session",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  status: "empty",
  chat: [],
});

export const useSessions = create<State>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeId: null,
      createSession: (name) => {
        const s = newSession(name);
        set((st) => ({ sessions: [s, ...st.sessions], activeId: s.id }));
        return s;
      },
      deleteSession: (id) =>
        set((st) => ({
          sessions: st.sessions.filter((s) => s.id !== id),
          activeId: st.activeId === id ? null : st.activeId,
        })),
      renameSession: (id, name) =>
        set((st) => ({
          sessions: st.sessions.map((s) => (s.id === id ? { ...s, name, updatedAt: Date.now() } : s)),
        })),
      duplicateSession: (id) => {
        const src = get().sessions.find((s) => s.id === id);
        if (!src) return null;
        const copy: Session = { ...src, id: crypto.randomUUID(), name: `${src.name} (copy)`, createdAt: Date.now(), updatedAt: Date.now() };
        set((st) => ({ sessions: [copy, ...st.sessions], activeId: copy.id }));
        return copy;
      },
      setActive: (id) => set({ activeId: id }),
      patch: (id, p) =>
        set((st) => ({
          sessions: st.sessions.map((s) => (s.id === id ? { ...s, ...p, updatedAt: Date.now() } : s)),
        })),
      setFiles: (id, resume, jd) =>
        set((st) => ({
          sessions: st.sessions.map((s) =>
            s.id === id ? { ...s, resume, jd, status: "ingested", updatedAt: Date.now() } : s,
          ),
        })),
      setAnalysis: (id, a) =>
        set((st) => ({
          sessions: st.sessions.map((s) =>
            s.id === id
              ? {
                  ...s,
                  analysis: a,
                  status: "analyzed",
                  name: a.jobRole && s.name === "Untitled session" ? a.jobRole : s.name,
                  updatedAt: Date.now(),
                }
              : s,
          ),
        })),
      appendChat: (id, msg) =>
        set((st) => ({
          sessions: st.sessions.map((s) =>
            s.id === id ? { ...s, chat: [...s.chat, msg], updatedAt: Date.now() } : s,
          ),
        })),
    }),
    { name: "ats-sessions-v1" },
  ),
);
