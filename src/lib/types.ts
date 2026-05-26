export type SessionStatus = "empty" | "uploading" | "ingested" | "analyzed" | "error";

export interface SessionFileMeta {
  name: string;
  size: number;
  type: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

export interface SessionAnalysis {
  raw: string;
  matchScore: number | null;
  jobRole: string | null;
  matchedSkills: string[];
  missingSkills: string[];
  missingKeywords: string[];
  suggestions: string[];
  verdict: string | null;
}

export interface Session {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  status: SessionStatus;
  resume?: SessionFileMeta;
  jd?: SessionFileMeta;
  analysis?: SessionAnalysis;
  chat: ChatMessage[];
}
