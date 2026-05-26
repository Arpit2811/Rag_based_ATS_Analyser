import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";

import { useSessions } from "@/lib/sessions-store";
import { UploadZone } from "@/components/upload-zone";
import { AnalysisDashboard } from "@/components/analysis-dashboard";
import { ChatPanel } from "@/components/chat-panel";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/sessions/$sessionId")({
  component: SessionPage,
});

function SessionPage() {
  const { sessionId } = Route.useParams();
  const session = useSessions((s) => s.sessions.find((x) => x.id === sessionId));

  if (!session) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Session not found.</p>
        <Link to="/" className="text-sm text-primary underline">
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/80 px-6 py-3 backdrop-blur">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Current Session</div>
          <div className="truncate text-sm font-semibold">{session.name}</div>
        </div>
        {session.resume && (
          <Badge variant="outline" className="gap-1.5">
            <FileText className="h-3 w-3" /> {session.resume.name}
          </Badge>
        )}
        {session.jd && (
          <Badge variant="outline" className="gap-1.5">
            <FileText className="h-3 w-3" /> {session.jd.name}
          </Badge>
        )}
        {session.analysis?.matchScore != null && (
          <Badge className="bg-gradient-primary text-primary-foreground">
            {session.analysis.matchScore}% match
          </Badge>
        )}
      </header>

      <div className="flex-1 px-6 py-8">
        {session.status === "uploading" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Ingesting documents &amp; running analysis…</p>
          </div>
        )}

        {session.status !== "uploading" && !session.analysis && (
          <UploadZone sessionId={session.id} />
        )}

        {session.analysis && (
          <>
            <AnalysisDashboard session={session} />
            <ChatPanel sessionId={session.id} />
          </>
        )}
      </div>
    </div>
  );
}
