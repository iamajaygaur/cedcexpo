"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Bell, CheckCheck, ClipboardCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { TABLES } from "@/lib/supabase/tables";
import { cn } from "@/lib/utils";

const MAX_ITEMS = 40;
const POLL_MS = 8_000;
const STORAGE_KEY = "cedc-eval-notifications-v1";

type EvalNotification = {
  id: string;
  evaluationId: string;
  message: string;
  detail?: string;
  at: number;
  read: boolean;
};

type EvalRow = {
  id: string;
  judge_id: string;
  team_id: string;
  status: string;
  submitted_at?: string | null;
};

function loadStored(): EvalNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EvalNotification[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

function saveStored(items: EvalNotification[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // ignore quota / private mode
  }
}

async function resolveMessage(
  judgeId: string,
  teamId: string,
): Promise<{ message: string; detail?: string }> {
  const supabase = createClient();
  const [{ data: judge }, { data: team }] = await Promise.all([
    supabase
      .from(TABLES.judges)
      .select("id, profiles(full_name, email)")
      .eq("id", judgeId)
      .maybeSingle(),
    supabase
      .from(TABLES.teams)
      .select("team_number, project_title, team_name")
      .eq("id", teamId)
      .maybeSingle(),
  ]);

  const profile = judge?.profiles as
    | { full_name?: string | null; email?: string | null }
    | null
    | undefined;
  const judgeName =
    profile?.full_name?.trim() ||
    profile?.email?.trim() ||
    "A judge";

  const teamNumber = team?.team_number?.trim() || "team";
  const project =
    team?.team_name?.trim() || team?.project_title?.trim() || "";

  return {
    message: `${judgeName} submitted an evaluation`,
    detail: project
      ? `Team ${teamNumber} · ${project}`
      : `Team ${teamNumber}`,
  };
}

function formatTime(at: number) {
  const diff = Date.now() - at;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type NotificationBellProps = {
  enabled?: boolean;
  className?: string;
};

export function NotificationBell({
  enabled = true,
  className,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<EvalNotification[]>([]);
  const [live, setLive] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const seenEvalIds = useRef(new Set<string>());
  // Look back slightly so a submit that happened while switching tabs still shows.
  const cursorRef = useRef<string>(
    new Date(Date.now() - 10 * 60_000).toISOString(),
  );
  const panelId = useId();

  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    const stored = loadStored();
    if (stored.length > 0) {
      setItems(stored);
      for (const n of stored) seenEvalIds.current.add(n.evaluationId);
      const newest = stored.reduce((m, n) => Math.max(m, n.at), 0);
      if (newest > 0) {
        cursorRef.current = new Date(newest).toISOString();
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveStored(items);
  }, [items, hydrated]);

  const pushNotification = useCallback(async (partial: Partial<EvalRow> & { id?: string }) => {
    const supabase = createClient();
    let row: EvalRow | null = null;

    if (
      partial.id &&
      partial.judge_id &&
      partial.team_id &&
      partial.status === "submitted"
    ) {
      row = partial as EvalRow;
    } else if (partial.id) {
      const { data } = await supabase
        .from(TABLES.evaluations)
        .select("id, judge_id, team_id, status, submitted_at")
        .eq("id", partial.id)
        .maybeSingle();
      row = data as EvalRow | null;
    }

    if (!row || row.status !== "submitted") return;
    if (seenEvalIds.current.has(row.id)) return;
    seenEvalIds.current.add(row.id);

    const submittedAt = row.submitted_at
      ? new Date(row.submitted_at).getTime()
      : Date.now();
    if (row.submitted_at && row.submitted_at > cursorRef.current) {
      cursorRef.current = row.submitted_at;
    }

    try {
      const { message, detail } = await resolveMessage(
        row.judge_id,
        row.team_id,
      );
      setItems((prev) => {
        if (prev.some((n) => n.evaluationId === row!.id)) return prev;
        return [
          {
            id: `${row!.id}-${submittedAt}`,
            evaluationId: row!.id,
            message,
            detail,
            at: submittedAt,
            read: false,
          },
          ...prev,
        ].slice(0, MAX_ITEMS);
      });
    } catch {
      setItems((prev) => {
        if (prev.some((n) => n.evaluationId === row!.id)) return prev;
        return [
          {
            id: `${row!.id}-${Date.now()}`,
            evaluationId: row!.id,
            message: "A judge submitted an evaluation",
            at: submittedAt,
            read: false,
          },
          ...prev,
        ].slice(0, MAX_ITEMS);
      });
    }
  }, []);

  const pollSubmitted = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from(TABLES.evaluations)
        .select("id, judge_id, team_id, status, submitted_at")
        .eq("status", "submitted")
        .gt("submitted_at", cursorRef.current)
        .order("submitted_at", { ascending: true })
        .limit(25);

      if (error || !data?.length) return;

      for (const row of data) {
        await pushNotification(row as EvalRow);
      }
    } catch {
      // keep trying on next tick
    }
  }, [pushNotification]);

  useEffect(() => {
    if (!enabled || !hydrated) return;

    let cancelled = false;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null =
      null;
    let supabase: ReturnType<typeof createClient> | null = null;
    const channelName = `admin-eval-notifications-${Math.random().toString(36).slice(2, 9)}`;

    // Catch anything submitted while this page was open (realtime can miss).
    void pollSubmitted();
    const pollId = window.setInterval(() => {
      if (!cancelled) void pollSubmitted();
    }, POLL_MS);

    try {
      supabase = createClient();
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "evaluations",
          },
          (payload) => {
            if (cancelled) return;
            const next = payload.new as EvalRow | null;
            if (!next?.id) return;
            void pushNotification(next);
          },
        )
        .subscribe((status) => {
          if (cancelled) return;
          setLive(status === "SUBSCRIBED");
        });
    } catch {
      setLive(false);
    }

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [enabled, hydrated, pollSubmitted, pushNotification]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  useEffect(() => {
    if (!open || unread === 0) return;
    const t = window.setTimeout(() => {
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    }, 1200);
    return () => window.clearTimeout(t);
  }, [open, unread]);

  if (!enabled) return null;

  return (
    <div className={cn("relative", className)} ref={panelRef}>
      <button
        type="button"
        className="relative flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
        aria-label={
          unread > 0
            ? `Notifications, ${unread} unread`
            : "Notifications"
        }
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="size-[18px]" aria-hidden />
        {unread > 0 ? (
          <span
            className="pulse-ring absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white ring-2 ring-background"
            aria-hidden
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label="Evaluation notifications"
          className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100dvw-2rem))] animate-scale-in overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-bold text-foreground">Notifications</p>
              <p className="text-[11px] text-muted-foreground">
                {live
                  ? "Live · checking every few seconds"
                  : "Polling for new submissions…"}
              </p>
            </div>
            {items.length > 0 ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={markAllRead}
              >
                <CheckCheck className="size-3.5" aria-hidden />
                Mark read
              </button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No evaluation submissions yet. When a judge submits, it will
              appear here within a few seconds.
            </p>
          ) : (
            <ul className="max-h-[22rem] overflow-y-auto">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "flex gap-3 border-b border-border/70 px-4 py-3 last:border-b-0",
                    !n.read && "bg-primary/5",
                  )}
                >
                  <span
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-tertiary/15 text-tertiary"
                    aria-hidden
                  >
                    <ClipboardCheck className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {n.message}
                    </p>
                    {n.detail ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {n.detail}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-muted-foreground/80">
                      {formatTime(n.at)}
                    </p>
                  </div>
                  {!n.read ? (
                    <span
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-destructive"
                      aria-label="Unread"
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
