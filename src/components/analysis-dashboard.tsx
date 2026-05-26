import { CheckCircle2, AlertCircle, Sparkles, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Session } from "@/lib/types";

function scoreClass(s: number) {
  if (s >= 75) return "text-success";
  if (s >= 50) return "text-warning";
  return "text-destructive";
}

export function AnalysisDashboard({ session }: { session: Session }) {
  const a = session.analysis;
  if (!a) return null;
  const score = a.matchScore ?? 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1 p-6 bg-gradient-subtle">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Match Score</div>
          <div className={cn("mt-2 text-5xl font-bold", scoreClass(score))}>{a.matchScore ?? "—"}{a.matchScore != null && "%"}</div>
          <Progress value={score} className="mt-3" />
          {a.jobRole && (
            <div className="mt-4 text-sm text-muted-foreground">
              Role: <span className="font-medium text-foreground">{a.jobRole}</span>
            </div>
          )}
        </Card>

        <Card className="md:col-span-2 p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Final Verdict
          </div>
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">
            {a.verdict ?? a.raw.slice(0, 600)}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SkillList
          title="Strong Matching Skills"
          icon={<CheckCircle2 className="h-4 w-4 text-success" />}
          items={a.matchedSkills}
          tone="success"
        />
        <SkillList
          title="Missing Skills"
          icon={<AlertCircle className="h-4 w-4 text-destructive" />}
          items={a.missingSkills}
          tone="destructive"
        />
        <SkillList
          title="Missing ATS Keywords"
          icon={<AlertCircle className="h-4 w-4 text-warning" />}
          items={a.missingKeywords}
          tone="warning"
        />
        <SkillList
          title="Improvement Suggestions"
          icon={<Sparkles className="h-4 w-4 text-primary" />}
          items={a.suggestions}
          tone="primary"
        />
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <FileText className="h-3.5 w-3.5" /> Full Analysis
        </div>
        <pre className="mt-3 whitespace-pre-wrap text-sm leading-relaxed font-sans">{a.raw}</pre>
      </Card>
    </div>
  );
}

function SkillList({
  title,
  items,
  icon,
  tone,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  tone: "success" | "destructive" | "warning" | "primary";
}) {
  const toneClass = {
    success: "bg-success/10 text-success border-success/20",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    warning: "bg-warning/10 text-warning-foreground border-warning/30",
    primary: "bg-accent text-accent-foreground border-primary/20",
  }[tone];

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon} {title}
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">Nothing extracted.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {items.map((s, i) => (
            <Badge key={i} variant="outline" className={cn("font-normal", toneClass)}>
              {s}
            </Badge>
          ))}
        </ul>
      )}
    </Card>
  );
}
