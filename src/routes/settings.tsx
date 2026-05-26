import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Plug, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_API_URL, getApiUrl, pingBackend, setApiUrl } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

type Status = { state: "idle" | "checking" | "ok" | "fail"; message?: string };

function SettingsPage() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>({ state: "idle" });

  useEffect(() => {
    const current = getApiUrl() || DEFAULT_API_URL;
    setUrl(current);
    void check(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const check = async (target?: string) => {
    setStatus({ state: "checking" });
    const r = await pingBackend(target ?? url);
    setStatus({ state: r.ok ? "ok" : "fail", message: r.message });
  };

  const save = async () => {
    const trimmed = url.trim();
    setApiUrl(trimmed);
    toast.success("Saved");
    await check(trimmed);
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Connect your self-hosted Python RAG backend.
      </p>

      <Card className="mt-6 p-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="api-url" className="text-sm font-semibold">
            Backend API URL
          </Label>
          <StatusPill status={status} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Default <code>{DEFAULT_API_URL}</code>. Change to your deployed FastAPI URL when hosting remotely.
        </p>
        <div className="mt-4 flex gap-2">
          <Input
            id="api-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={DEFAULT_API_URL}
          />
          <Button variant="outline" onClick={() => check()} disabled={status.state === "checking"}>
            {status.state === "checking" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plug className="mr-2 h-4 w-4" />
            )}
            Test
          </Button>
          <Button onClick={save}>
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>
        </div>
        {status.message && (
          <p
            className={cn(
              "mt-3 text-xs",
              status.state === "ok" ? "text-emerald-600" : status.state === "fail" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {status.message}
          </p>
        )}
      </Card>

      <Card className="mt-4 p-6">
        <div className="text-sm font-semibold">Run the backend</div>
        <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs">
{`cd python-backend
pip install fastapi uvicorn python-multipart python-dotenv \\
  langchain langchain-community langchain-chroma langchain-openai \\
  langchain-text-splitters pypdf docx2txt
export OPENAI_API_KEY=sk-...
export CORS_ORIGINS="*"
uvicorn server:app --host 0.0.0.0 --port 8000 --reload`}
        </pre>
        <p className="mt-2 text-xs text-muted-foreground">
          Endpoints used: <code>/sessions/{"{sid}"}/ingest</code>, <code>/analyze</code>, <code>/chat</code>, <code>DELETE /sessions/{"{sid}"}</code>, <code>/health</code>.
        </p>
      </Card>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  if (status.state === "checking")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Checking
      </span>
    );
  if (status.state === "ok")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-600">
        <CheckCircle2 className="h-3 w-3" /> Connected
      </span>
    );
  if (status.state === "fail")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs text-destructive">
        <XCircle className="h-3 w-3" /> Offline
      </span>
    );
  return null;
}
