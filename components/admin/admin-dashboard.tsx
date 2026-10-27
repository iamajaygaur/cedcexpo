"use client";

import {
  useEffect,
  useMemo,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  ClipboardList,
  FileUp,
  Flag,
  Gavel,
  GitFork,
  Layers,
  Pause,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { setEventStatusAction } from "@/lib/admin/actions/events";
import type { MonitorSnapshot } from "@/lib/admin/monitor-data";
import { getGroupColorToken } from "@/lib/groups/color-tokens";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { AppFooter } from "@/components/shared/app-footer";

/* ── Variants ─────────────────────────────────────────────────── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

/* ── Helpers ──────────────────────────────────────────────────── */

type AdminDashboardProps = {
  snapshot: MonitorSnapshot;
};

function modeExpected(teams: MonitorSnapshot["teams"]): number {
  const counts = new Map<number, number>();
  for (const t of teams) {
    if (t.expected <= 0) continue;
    counts.set(t.expected, (counts.get(t.expected) ?? 0) + 1);
  }
  let best = 2;
  let bestN = 0;
  for (const [expected, n] of counts) {
    if (n > bestN) {
      best = expected;
      bestN = n;
    }
  }
  return best;
}

function teamStatusBreakdown(snapshot: MonitorSnapshot) {
  let complete = 0;
  let partial = 0;
  let none = 0;
  for (const t of snapshot.teams) {
    if (t.expected <= 0) {
      none += 1;
      continue;
    }
    if (t.submitted >= t.expected) complete += 1;
    else if (t.submitted > 0) partial += 1;
    else none += 1;
  }
  const total = complete + partial + none;
  const req = modeExpected(snapshot.teams);
  return {
    complete,
    partial,
    none,
    total,
    req,
    completePct: total ? (complete / total) * 100 : 0,
    partialPct: total ? (partial / total) * 100 : 0,
    nonePct: total ? (none / total) * 100 : 0,
  };
}

function progressLabel(submitted: number, expected: number): string {
  if (expected <= 0) return "0%";
  const pct = (submitted / expected) * 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`;
}

/* ── Main Component ───────────────────────────────────────────── */

export function AdminDashboard({ snapshot }: AdminDashboardProps) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [pending, startTransition] = useTransition();
  const { event, overall, groups } = snapshot;
  const status = teamStatusBreakdown(snapshot);
  const isLive = event.status === "active";
  const progressText = progressLabel(overall.submitted, overall.expected);

  useEffect(() => {
    const refresh = () => {
      startTransition(() => {
        router.refresh();
      });
    };

    const pollId = window.setInterval(refresh, 30_000);

    let cancelled = false;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null =
      null;
    let supabase: ReturnType<typeof createClient> | null = null;

    try {
      supabase = createClient();
      const eventId = snapshot.event.id;
      channel = supabase
        .channel(`dashboard-${eventId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "evaluations",
            filter: `event_id=eq.${eventId}`,
          },
          refresh,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "teams",
            filter: `event_id=eq.${eventId}`,
          },
          refresh,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "judge_group_members",
            filter: `event_id=eq.${eventId}`,
          },
          refresh,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "judging_assignments",
            filter: `event_id=eq.${eventId}`,
          },
          refresh,
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "judges" },
          refresh,
        )
        .subscribe();
    } catch {
      // Polling still covers updates if realtime is unavailable.
    }

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
      void cancelled;
    };
  }, [router, snapshot.event.id]);

  const activeClusters = useMemo(
    () => groups.filter((g) => g.judgeCount > 0 || g.teamCount > 0).length,
    [groups],
  );

  function onPauseEvent() {
    const fd = new FormData();
    fd.set("id", event.id);
    fd.set("status", "draft");
    startTransition(async () => {
      await setEventStatusAction({ ok: true }, fd);
      router.refresh();
    });
  }

  function onCompleteEvent() {
    const ok = window.confirm(
      "Mark this event completed?\n\nJudging will close. Teams, scores, and assignments are kept. You can download results anytime from Archive and Reports.",
    );
    if (!ok) return;
    const fd = new FormData();
    fd.set("id", event.id);
    fd.set("status", "completed");
    startTransition(async () => {
      await setEventStatusAction({ ok: true }, fd);
      router.refresh();
      router.push(`/admin/archive/${event.id}`);
    });
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-800">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-600" />
                </span>
                Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {event.status}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {isLive
                ? "Listening for evaluation changes…"
                : "Auto-refresh paused"}
            </span>
          </div>
          <div className="min-w-0 space-y-1">
            {event.semester?.trim() ? (
              <p className="text-sm font-medium text-muted-foreground">
                {event.semester.trim()}
              </p>
            ) : null}
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {event.name}
            </h1>
            {/* Gold accent line */}
            <div className="h-1 w-16 rounded-full bg-gradient-to-r from-primary to-primary/40" aria-hidden />
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full gap-2 sm:w-auto"
          >
            <a href={`/api/admin/export/rankings?eventId=${event.id}`}>
              <FileUp className="size-4" aria-hidden />
              Export Data
            </a>
          </Button>
          <Button
            type="button"
            size="lg"
            className="w-full gap-2 sm:w-auto"
            disabled={pending || !isLive}
            onClick={onPauseEvent}
          >
            <Pause className="size-4" aria-hidden />
            Pause Event
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full gap-2 sm:w-auto"
            disabled={pending || !isLive}
            onClick={onCompleteEvent}
          >
            <Flag className="size-4" aria-hidden />
            Complete Event
          </Button>
        </div>
      </motion.div>

      {/* ── KPI hierarchy: Progress hero + supporting metrics ── */}
      <motion.section
        variants={containerVariants}
        className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.85fr)]"
      >
        <MetricCard
          label="Overall Progress"
          value={progressText}
          hint={`${overall.submitted} of ${overall.expected} required evals`}
          icon={TrendingUp}
          tone="gold"
          featured
          footer={
            <div
              className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted/80"
              role="progressbar"
              aria-valuenow={overall.submitted}
              aria-valuemin={0}
              aria-valuemax={Math.max(1, overall.expected)}
              aria-label="Overall evaluation progress"
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, overall.percent)}%` }}
                transition={{
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1] as const,
                  delay: 0.3,
                }}
              />
            </div>
          }
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          <MetricCard
            label="Teams"
            value={overall.teamCount}
            hint="In this event"
            icon={Users}
            tone="gold"
          />
          <MetricCard
            label="Required"
            value={overall.expected}
            hint="Eval target"
            icon={ClipboardList}
            tone="muted"
          />
          <MetricCard
            label="Completed"
            value={overall.submitted}
            hint="Submitted"
            icon={UserCheck}
            tone="teal"
          />
          <MetricCard
            label="Remaining"
            value={overall.pending}
            hint="Still open"
            icon={UserX}
            tone={overall.pending > 0 ? "alert" : "muted"}
          />
          <MetricCard
            label="Judges"
            value={overall.judgeCount}
            hint="Active"
            icon={Gavel}
            tone="muted"
          />
          <MetricCard
            label="Clusters"
            value={activeClusters}
            hint="Groups live"
            icon={Layers}
            tone="muted"
          />
        </div>
      </motion.section>

      {/* ── Two-column Section ────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)]">
        {/* ── Team Evaluation Status ─────────────────────────── */}
        <motion.article
          variants={itemVariants}
          className="dash-panel min-w-0 p-4 sm:p-6"
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <p className="dash-section-label mb-1">Overview</p>
              <h2 className="text-base font-bold text-foreground">
                Team Evaluation Status
              </h2>
            </div>
            <RefreshCw
              className="size-4 text-muted-foreground"
              aria-hidden
            />
          </div>

          <TeamStatusBreakdown
            complete={status.complete}
            partial={status.partial}
            none={status.none}
            total={status.total}
            completePct={status.completePct}
            partialPct={status.partialPct}
            nonePct={status.nonePct}
          />

          <ul className="mt-5 space-y-2.5">
            <StatusRow
              dotClassName="bg-tertiary"
              title="Complete"
              subtitle={`${status.req}/${status.req} evaluations`}
              count={status.complete}
              pct={status.completePct}
              countClassName="text-tertiary"
              barClassName="bg-tertiary"
            />
            <StatusRow
              dotClassName="bg-status-partial"
              title="Partial"
              subtitle={`In progress · ${status.req} expected`}
              count={status.partial}
              pct={status.partialPct}
              countClassName="text-status-partial"
              barClassName="bg-status-partial"
            />
            <StatusRow
              dotClassName="bg-destructive/50"
              title="Not Evaluated"
              subtitle={`0/${status.req} evaluations`}
              count={status.none}
              pct={status.nonePct}
              countClassName="text-destructive"
              barClassName="bg-destructive/50"
            />
          </ul>
        </motion.article>

        {/* ── Live Group Progress ─────────────────────────────── */}
        <motion.article
          variants={itemVariants}
          className="dash-panel min-w-0 p-4 sm:p-6"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="dash-section-label mb-1">Live</p>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Group Progress
                </h2>
                <GitFork
                  className="size-4 text-muted-foreground"
                  aria-hidden
                />
              </div>
            </div>
            <span className="rounded-md bg-muted/70 px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {activeClusters} active cluster{activeClusters === 1 ? "" : "s"}
            </span>
          </div>

          {groups.length === 0 ? (
            <p className="dash-empty text-sm text-muted-foreground">
              No color groups yet. Create groups to track live progress.
            </p>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-3 sm:grid-cols-2"
            >
              {groups.map((g, i) => {
                const token = getGroupColorToken(g.group.color_key);
                const remaining = Math.max(0, g.expected - g.submitted);
                const done = g.expected > 0 && g.submitted >= g.expected;
                return (
                  <motion.article
                    key={g.group.id}
                    variants={itemVariants}
                    whileHover={
                      reducedMotion
                        ? undefined
                        : { y: -4, transition: { duration: 0.2 } }
                    }
                    className="dash-metric flex flex-col overflow-hidden transition-shadow hover:shadow-md"
                  >
                    <div
                      className={cn("h-1 w-full shrink-0", token.barClass)}
                    />

                    <div
                      className={cn(
                        "flex items-start justify-between gap-2 px-4 py-3",
                        token.bgClass,
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "size-2.5 shrink-0 rounded-full",
                              token.dotClass,
                            )}
                            aria-hidden
                          />
                          <h3 className="truncate text-base font-bold tracking-tight text-foreground">
                            {g.group.name}
                          </h3>
                        </div>
                        <p className="mt-0.5 flex items-center gap-1.5 pl-[18px] text-xs font-medium text-muted-foreground">
                          <Users className="size-3 shrink-0" aria-hidden />
                          {g.judgeCount} Judge
                          {g.judgeCount === 1 ? "" : "s"}
                          <span className="text-border" aria-hidden>
                            ·
                          </span>
                          <Layers className="size-3 shrink-0" aria-hidden />
                          {g.teamCount} team
                          {g.teamCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center rounded-md border border-border/60 bg-card/80 px-2 py-0.5 text-[11px] font-bold tabular-nums shadow-sm backdrop-blur-sm">
                        <span className={token.textClass}>{g.percent}%</span>
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col px-4 py-3">
                      <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                        <span>{done ? "Complete" : "In progress"}</span>
                        {g.draft > 0 ? (
                          <span className="tabular-nums text-amber-700">
                            {g.draft} draft{g.draft === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </div>
                      <div
                        className="h-2.5 overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-valuenow={g.submitted}
                        aria-valuemin={0}
                        aria-valuemax={Math.max(1, g.expected)}
                        aria-label={`${g.group.name} progress`}
                      >
                        <motion.div
                          className={cn("h-full rounded-full", token.barClass)}
                          initial={reducedMotion ? false : { width: 0 }}
                          animate={{
                            width: `${Math.min(100, g.percent)}%`,
                          }}
                          transition={
                            reducedMotion
                              ? { duration: 0 }
                              : {
                                  duration: 0.7,
                                  ease: [0.16, 1, 0.3, 1] as const,
                                  delay: 0.12 + i * 0.05,
                                }
                          }
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
                      <span>
                        <span className="font-semibold tabular-nums text-foreground">
                          {g.submitted}
                        </span>
                        /{g.expected} evals
                      </span>
                      <span>
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            remaining > 0
                              ? "text-foreground"
                              : "text-tertiary",
                          )}
                        >
                          {remaining}
                        </span>{" "}
                        remaining
                      </span>
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>
          )}
        </motion.article>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <AppFooter supportEmail={event.support_email} linkBase="/admin" />
      </motion.div>
    </motion.div>
  );
}

/* ── MetricCard ─────────────────────────────────────────────── */

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "gold",
  featured = false,
  footer,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "gold" | "teal" | "alert" | "muted";
  featured?: boolean;
  footer?: React.ReactNode;
}) {
  const tones = {
    gold: {
      iconWrap: "bg-[color-mix(in_srgb,var(--cu-gold)_28%,white)] text-primary",
      value: "text-foreground",
    },
    teal: {
      iconWrap: "bg-[color-mix(in_srgb,var(--tertiary)_18%,white)] text-tertiary",
      value: "text-foreground",
    },
    alert: {
      iconWrap:
        "bg-[color-mix(in_srgb,var(--destructive)_14%,white)] text-destructive",
      value: "text-destructive",
    },
    muted: {
      iconWrap: "bg-muted text-muted-foreground",
      value: "text-foreground",
    },
  } as const;

  const t = tones[tone];

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        "flex h-full min-w-0 flex-col gap-2 px-3 py-3 transition-shadow hover:shadow-md sm:flex-row sm:items-start sm:gap-3 sm:px-4 sm:py-3.5",
        featured ? "dash-panel--featured rounded-xl p-4 sm:p-5" : "dash-metric",
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl",
          featured ? "size-11 sm:size-12" : "size-9 sm:size-10",
          t.iconWrap,
        )}
        aria-hidden
      >
        <Icon
          className={featured ? "size-5 sm:size-6" : "size-4 sm:size-5"}
          strokeWidth={2}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase leading-tight tracking-wider text-muted-foreground sm:text-[11px]">
          {label}
        </p>
        <p
          className={cn(
            "mt-0.5 font-bold tabular-nums tracking-tight",
            featured ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl",
            t.value,
          )}
        >
          {value}
        </p>
        {hint ? (
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            {hint}
          </p>
        ) : null}
        {footer}
      </div>
    </motion.div>
  );
}

/* ── TeamStatusBreakdown (bars > donuts for comparison) ─────── */

function TeamStatusBreakdown({
  complete,
  partial,
  none,
  total,
  completePct,
  partialPct,
  nonePct,
}: {
  complete: number;
  partial: number;
  none: number;
  total: number;
  completePct: number;
  partialPct: number;
  nonePct: number;
}) {
  const completeShare = total > 0 ? Math.round(completePct) : 0;

  return (
    <div
      className="space-y-3"
      role="img"
      aria-label={`Complete ${complete}, partial ${partial}, not evaluated ${none}`}
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
            {total}
          </p>
          <p className="text-xs font-medium text-muted-foreground">
            teams assigned
          </p>
        </div>
        <p className="text-sm font-semibold tabular-nums text-tertiary">
          {completeShare}% complete
        </p>
      </div>
      <div className="flex h-3.5 overflow-hidden rounded-full bg-muted">
        {total > 0 ? (
          <>
            <motion.div
              className="h-full bg-tertiary"
              initial={{ width: 0 }}
              animate={{ width: `${completePct}%` }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.div
              className="h-full bg-status-partial"
              initial={{ width: 0 }}
              animate={{ width: `${partialPct}%` }}
              transition={{
                duration: 0.7,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.05,
              }}
            />
            <motion.div
              className="h-full bg-destructive/45"
              initial={{ width: 0 }}
              animate={{ width: `${nonePct}%` }}
              transition={{
                duration: 0.7,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.1,
              }}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ── StatusRow ──────────────────────────────────────────────── */

function StatusRow({
  dotClassName,
  title,
  subtitle,
  count,
  pct,
  countClassName,
  barClassName,
}: {
  dotClassName: string;
  title: string;
  subtitle: string;
  count: number;
  pct?: number;
  countClassName?: string;
  barClassName?: string;
}) {
  return (
    <li className="rounded-lg px-2 py-2 transition-colors hover:bg-muted/40">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn("size-2.5 shrink-0 rounded-full", dotClassName)}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <p
          className={cn(
            "text-xl font-bold tabular-nums sm:text-2xl",
            countClassName,
          )}
        >
          {count}
        </p>
      </div>
      {typeof pct === "number" && barClassName ? (
        <div className="mt-2 ml-[18px] h-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full", barClassName)}
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </div>
      ) : null}
    </li>
  );
}
