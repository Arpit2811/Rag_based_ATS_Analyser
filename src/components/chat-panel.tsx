import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSessions } from "@/lib/sessions-store";
import { chatSession } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ChatPanel({ sessionId }: { sessionId: string }) {
  const session = useSessions((s) => s.sessions.find((x) => x.id === sessionId));
  const appendChat = useSessions((s) => s.appendChat);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  if (!session) return null;

  const send = async () => {
    const msg = input.trim();
    if (!msg || busy) return;
    setBusy(true);
    setInput("");
    appendChat(sessionId, { role: "user", content: msg, ts: Date.now() });
    try {
      const { answer } = await chatSession(sessionId, msg, session.chat);
      appendChat(sessionId, { role: "assistant", content: answer, ts: Date.now() });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mx-auto mt-6 flex w-full max-w-4xl flex-col p-4">
      <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
        Follow-up questions
      </div>
      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
        {session.chat.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask anything about this analysis — e.g. <em>"What concrete projects would close the missing skills gap?"</em>
          </p>
        )}
        {session.chat.map((m, i) => (
          <div
            key={i}
            className={cn(
              "rounded-lg px-3 py-2 text-sm",
              m.role === "user" ? "bg-accent text-accent-foreground ml-8" : "bg-muted mr-8",
            )}
          >
            <div className="mb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              {m.role}
            </div>
            <div className="whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask a follow-up…"
          disabled={busy}
        />
        <Button onClick={send} disabled={busy || !input.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </Card>
  );
}
