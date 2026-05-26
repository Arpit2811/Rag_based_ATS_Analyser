import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiUrl, setApiUrl } from "@/lib/api-client";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(getApiUrl());
  }, []);

  const save = () => {
    setApiUrl(url.trim());
    toast.success("Saved");
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Configure your self-hosted Python RAG backend.
      </p>

      <Card className="mt-6 p-6">
        <Label htmlFor="api-url" className="text-sm font-semibold">
          Backend API URL
        </Label>
        <p className="mt-1 text-xs text-muted-foreground">
          The base URL where your FastAPI server is running (e.g. <code>https://ats-api.example.com</code>).
          The app expects these endpoints:
        </p>
        <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
          <li><code>POST /sessions/{"{sid}"}/ingest</code></li>
          <li><code>POST /sessions/{"{sid}"}/analyze</code></li>
          <li><code>POST /sessions/{"{sid}"}/chat</code></li>
          <li><code>DELETE /sessions/{"{sid}"}</code></li>
        </ul>
        <div className="mt-4 flex gap-2">
          <Input
            id="api-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-backend.example.com"
          />
          <Button onClick={save}>
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>
        </div>
      </Card>

      <Card className="mt-4 p-6">
        <div className="text-sm font-semibold">Backend reference</div>
        <p className="mt-1 text-xs text-muted-foreground">
          A ready-to-run FastAPI server lives in <code>python-backend/</code> in this project. It wraps
          your ingestion &amp; retrieval pipelines with per-session ChromaDB isolation
          (<code>chroma_db/{"<session_id>"}/</code>).
        </p>
      </Card>
    </div>
  );
}
