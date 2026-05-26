import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Sparkles, Plus, Database, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSessions } from "@/lib/sessions-store";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const createSession = useSessions((s) => s.createSession);
  const sessions = useSessions((s) => s.sessions);

  const start = () => {
    const s = createSession();
    navigate({ to: "/sessions/$sessionId", params: { sessionId: s.id } });
  };

  return (
    <div className="mx-auto flex min-h-full max-w-4xl flex-col items-center px-6 py-16">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary shadow-elegant">
        <Sparkles className="h-7 w-7 text-white" />
      </div>
      <h1 className="mt-6 text-center text-4xl font-bold tracking-tight">
        Welcome to <span className="text-gradient">ATS Pilot</span>
      </h1>
      <p className="mt-3 max-w-xl text-center text-muted-foreground">
        Upload a resume and job description. Each analysis runs in its own isolated vector database —
        no cross-contamination between sessions.
      </p>

      <Button size="lg" className="mt-8 bg-gradient-primary text-primary-foreground shadow-elegant" onClick={start}>
        <Plus className="mr-2 h-4 w-4" /> Start a new session
      </Button>

      <div className="mt-16 grid w-full gap-4 sm:grid-cols-3">
        <Feature icon={<Database className="h-5 w-5" />} title="Isolated Storage" body="Every session gets its own ChromaDB collection." />
        <Feature icon={<Zap className="h-5 w-5" />} title="RAG-Powered" body="Retrieval-augmented analysis with follow-up chat." />
        <Feature icon={<Shield className="h-5 w-5" />} title="Session History" body="Revisit, rename, duplicate, or delete past analyses." />
      </div>

      {sessions.length > 0 && (
        <div className="mt-12 w-full">
          <div className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Recent sessions</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {sessions.slice(0, 4).map((s) => (
              <Card
                key={s.id}
                className="cursor-pointer p-4 transition-shadow hover:shadow-soft"
                onClick={() => navigate({ to: "/sessions/$sessionId", params: { sessionId: s.id } })}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.analysis?.jobRole ?? "—"}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gradient">
                    {s.analysis?.matchScore != null ? `${s.analysis.matchScore}%` : "—"}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card className="p-5">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">{icon}</div>
      <div className="mt-3 text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{body}</div>
    </Card>
  );
}
