import type { SessionAnalysis } from "./types";

// Best-effort parsing of the LLM's free-form analysis output.
export function parseAnalysis(raw: string): SessionAnalysis {
  const lower = raw.toLowerCase();

  const scoreMatch = raw.match(/match\s*score[^\d]{0,15}(\d{1,3})/i) ?? raw.match(/\b(\d{1,3})\s*\/\s*100\b/);
  const matchScore = scoreMatch ? Math.min(100, parseInt(scoreMatch[1], 10)) : null;

  const extractList = (...labels: string[]): string[] => {
    for (const label of labels) {
      const re = new RegExp(`${label}[^\\n]*\\n([\\s\\S]*?)(?:\\n\\s*\\n|\\n\\s*\\d\\.|\\n\\s*##|$)`, "i");
      const m = raw.match(re);
      if (m) {
        return m[1]
          .split("\n")
          .map((l) => l.replace(/^[\s\-\*•\d.]+/, "").trim())
          .filter((l) => l.length > 0 && l.length < 200)
          .slice(0, 15);
      }
    }
    return [];
  };

  const matchedSkills = extractList("strong matching skills", "matching skills", "matched skills");
  const missingSkills = extractList("missing skills");
  const missingKeywords = extractList("missing ats keywords", "missing keywords");
  const suggestions = extractList("resume improvement suggestions", "improvement suggestions", "suggestions");

  const verdictMatch = raw.match(/final verdict[^\n]*\n([\s\S]*?)(?:\n\s*\n|$)/i);
  const verdict = verdictMatch ? verdictMatch[1].trim().slice(0, 600) : null;

  // Try to guess job role from raw text
  const roleMatch = raw.match(/(?:for|as)\s+(?:a|an)\s+([A-Z][A-Za-z /&-]{2,40}?)(?:role|position|\.|,|\n)/);
  const jobRole = roleMatch ? roleMatch[1].trim() : null;

  return {
    raw,
    matchScore,
    jobRole,
    matchedSkills,
    missingSkills,
    missingKeywords,
    suggestions,
    verdict,
  };
  void lower;
}
