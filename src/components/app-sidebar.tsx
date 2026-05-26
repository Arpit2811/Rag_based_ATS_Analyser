import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { MoreHorizontal, Plus, Settings, Sparkles, Trash2, Copy, Pencil, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSessions } from "@/lib/sessions-store";
import { deleteSessionFiles } from "@/lib/file-storage";
import { deleteRemoteSession } from "@/lib/api-client";
import type { Session } from "@/lib/types";

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function scoreColor(score: number | null | undefined) {
  if (score == null) return "bg-sidebar-accent text-sidebar-foreground/60";
  if (score >= 75) return "bg-success/20 text-success";
  if (score >= 50) return "bg-warning/20 text-warning";
  return "bg-destructive/20 text-destructive";
}

export function AppSidebar() {
  const navigate = useNavigate();
  const { sessions, activeId, createSession, deleteSession, renameSession, duplicateSession } =
    useSessions();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [renaming, setRenaming] = useState<Session | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const onNew = () => {
    const s = createSession();
    navigate({ to: "/sessions/$sessionId", params: { sessionId: s.id } });
  };

  const onDelete = async (s: Session) => {
    deleteSession(s.id);
    await Promise.all([deleteSessionFiles(s.id), deleteRemoteSession(s.id)]);
    toast.success("Session deleted");
    if (activeId === s.id || pathname.includes(s.id)) navigate({ to: "/" });
  };

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-4 pt-5 pb-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary shadow-elegant">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">ATS Pilot</div>
            <div className="text-[11px] text-sidebar-foreground/60">Resume × JD Analyzer</div>
          </div>
        </Link>
      </div>

      <div className="px-3 pb-3">
        <Button
          onClick={onNew}
          className="w-full justify-start gap-2 bg-sidebar-primary text-sidebar-primary-foreground hover:opacity-90 shadow-elegant"
        >
          <Plus className="h-4 w-4" /> New Session
        </Button>
      </div>

      <div className="px-4 pt-2 pb-1 text-[11px] uppercase tracking-wider text-sidebar-foreground/50">
        Sessions
      </div>

      <ScrollArea className="flex-1 px-2">
        {sessions.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-sidebar-foreground/50">
            No sessions yet. Click <span className="text-sidebar-foreground">+ New Session</span> to start.
          </div>
        ) : (
          <ul className="space-y-1 pb-3">
            {sessions.map((s) => {
              const active = pathname === `/sessions/${s.id}`;
              return (
                <li key={s.id}>
                  <div
                    className={cn(
                      "group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "hover:bg-sidebar-accent/60",
                    )}
                  >
                    <Link
                      to="/sessions/$sessionId"
                      params={{ sessionId: s.id }}
                      className="flex min-w-0 flex-1 items-center gap-2"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/60" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{s.name}</div>
                        <div className="flex items-center gap-2 text-[11px] text-sidebar-foreground/50">
                          <span>{timeAgo(s.updatedAt)}</span>
                          {s.analysis?.jobRole && (
                            <>
                              <span>·</span>
                              <span className="truncate">{s.analysis.jobRole}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                          scoreColor(s.analysis?.matchScore ?? null),
                        )}
                      >
                        {s.analysis?.matchScore != null ? `${s.analysis.matchScore}%` : "—"}
                      </span>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="rounded p-1 opacity-0 hover:bg-sidebar-accent group-hover:opacity-100"
                          aria-label="Session menu"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setRenaming(s);
                            setRenameValue(s.name);
                          }}
                        >
                          <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const c = duplicateSession(s.id);
                            if (c) navigate({ to: "/sessions/$sessionId", params: { sessionId: c.id } });
                          }}
                        >
                          <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(s)}>
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>

      <div className="border-t border-sidebar-border p-3">
        <Link
          to="/settings"
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-sidebar-accent/60",
            pathname === "/settings" && "bg-sidebar-accent",
          )}
        >
          <Settings className="h-4 w-4" /> Settings
        </Link>
      </div>

      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename session</DialogTitle>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (renaming && renameValue.trim()) {
                  renameSession(renaming.id, renameValue.trim());
                  toast.success("Renamed");
                }
                setRenaming(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
