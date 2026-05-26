import { useCallback, useState } from "react";
import { FileUp, Loader2, FileText, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSessions } from "@/lib/sessions-store";
import { putFile } from "@/lib/file-storage";
import { analyzeSession, ingestSession } from "@/lib/api-client";
import { parseAnalysis } from "@/lib/parse-analysis";

interface Props {
  sessionId: string;
}

function FilePicker({
  label,
  accept,
  file,
  onChange,
}: {
  label: string;
  accept: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const [drag, setDrag] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onChange(f);
      }}
      className={cn(
        "relative flex h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all",
        drag ? "border-primary bg-accent/40" : "border-border hover:border-primary/50 hover:bg-muted/50",
      )}
    >
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <>
          <FileText className="h-6 w-6 text-primary" />
          <div className="px-4 text-center text-sm font-medium">{file.name}</div>
          <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div>
          <button
            type="button"
            className="absolute right-2 top-2 rounded-full bg-background p-1 shadow-soft hover:bg-muted"
            onClick={(e) => {
              e.preventDefault();
              onChange(null);
            }}
          >
            <X className="h-3 w-3" />
          </button>
        </>
      ) : (
        <>
          <FileUp className="h-6 w-6 text-muted-foreground" />
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">PDF or DOCX · drag &amp; drop</div>
        </>
      )}
    </label>
  );
}

export function UploadZone({ sessionId }: Props) {
  const { setFiles, setAnalysis, patch } = useSessions();
  const [resume, setResume] = useState<File | null>(null);
  const [jd, setJd] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    if (!resume || !jd) return;
    setBusy(true);
    patch(sessionId, { status: "uploading" });
    try {
      await Promise.all([putFile(sessionId, "resume", resume), putFile(sessionId, "jd", jd)]);
      await ingestSession(sessionId, resume, jd);
      setFiles(
        sessionId,
        { name: resume.name, size: resume.size, type: resume.type },
        { name: jd.name, size: jd.size, type: jd.type },
      );
      const { analysis } = await analyzeSession(sessionId);
      setAnalysis(sessionId, parseAnalysis(analysis));
      toast.success("Analysis ready");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      patch(sessionId, { status: "error" });
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }, [resume, jd, sessionId, setFiles, setAnalysis, patch]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Upload Resume &amp; Job Description</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Each session keeps its own isolated vector database — uploads never mix across analyses.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FilePicker label="Upload Resume" accept=".pdf,.docx" file={resume} onChange={setResume} />
        <FilePicker label="Upload Job Description" accept=".pdf,.docx" file={jd} onChange={setJd} />
      </div>

      <div className="mt-6 flex justify-center">
        <Button
          size="lg"
          className="bg-gradient-primary text-primary-foreground shadow-elegant"
          disabled={!resume || !jd || busy}
          onClick={run}
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…
            </>
          ) : (
            "Run ATS Analysis"
          )}
        </Button>
      </div>
    </div>
  );
}
