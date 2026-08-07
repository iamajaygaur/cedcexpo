"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import {
  Clock,
  Gavel,
  Layers,
  Radio,
  Users,
} from "lucide-react";

import { AnalyticsGauge } from "@/components/admin/analytics-gauge";
import { GroupBadge } from "@/components/shared/group-badge";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import type {
  MonitorGroupProgress,
  MonitorJudgeRow,
  MonitorSnapshot,
  MonitorTeamRow,
} from "@/lib/admin/monitor-data";
import { getGroupColorToken } from "@/lib/groups/color-tokens";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type LiveMonitorProps = {
  snapshot: MonitorSnapshot;
  initialGroupFilter?: string;
};

type Tab = "teams" | "judges";

const GROUP_HEX: Record<string, string> = {
  red: "#c62828",
  blue: "#1565c0",
  green: "#2e7d32",
  yellow: "#f9a825",
  orange: "#ef6c00",
};

export function LiveMonitor({
  snapshot,
  initialGroupFilter = "all",
}: LiveMonitorProps) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [, startTransition] = useTransition();
  const [groupFilter, setGroupFilter] = useState(initialGroupFilter);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("teams");
  const [live, setLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null =
      null;
    let supabase: ReturnType<typeof createClient> | null = null;

    try {
      supabase = createClient();
      channel = supabase
        .channel(`monitor-evals-${snapshot.event.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "evaluations",
            filter: `event_id=eq.${snapshot.event.id}`,
          },
          () => {
            if (cancelled) return;
            setLastUpdate(new Date());
            startTransition(() => {
              router.refresh();
            });
          },
        )
        .subscribe((status) => {
          if (!cancelled) setLive(status === "SUBSCRIBED");
        });
    } catch {
      setLive(false);
    }

    return () => {
      cancelled = true;
      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [snapshot.event.id, router]);

  const filteredGroups = useMemo(() => {
    if (groupFilter === "all") return snapshot.groups;
    return snapshot.groups.filter(
      (g) =>
        g.group.id === groupFilter || g.group.color_key === groupFilter,
    );
  }, [snapshot.groups, groupFilter]);

  const filteredTeams = useMemo(() => {
    return filterTeams(snapshot.teams, groupFilter, query);
  }, [snapshot.teams, groupFilter, query]);

  const filteredJudges = useMemo(() => {
    return filterJudges(snapshot.judges, groupFilter, query);
  }, [snapshot.judges, groupFilter, query]);

  const { overall } = snapshot;
  const mix = useMemo(() => buildEvalMix(overall), [overall]);
  const teamStatus = useMemo(
    () => buildTeamStatus(snapshot.teams),
    [snapshot.teams],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
            live
              ? "bg-emerald-100 text-emerald-800"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Radio className="size-3.5" aria-hidden />
          {live ? "Live" : "Polling"}
        </span>
        {lastUpdate ? (
          <span>Updated {lastUpdate.toLocaleTimeString()}</span>
        ) : (
          <span>Listening for evaluation changes…</span>
        )}
      </div>

      {/* Analytics overview — gauges + composition */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Overall
          </p>
          <h2 className="mb-3 text-base font-bold tracking-tight text-foreground">
            Completion
          </h2>
          <AnalyticsGauge
            value={overall.percent}
            label="Complete"
            detail={`${overall.submitted} of ${overall.expected} evaluations`}
            size="md"
          />
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pipeline
          </p>
          <h2 className="mb-3 text-base font-bold tracking-tight text-foreground">
            Evaluation mix
          </h2>
          <CompositionDonut
            slices={mix.slices}
            centerValue={overall.expected}
            centerLabel="Expected"
            ariaLabel={`Submitted ${overall.submitted}, in progress ${overall.draft}, pending ${overall.pending}`}
          />
          <ul className="mt-4 space-y-2 text-sm">
            {mix.slices.map((s) => (
              <li
                key={s.key}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: s.color }}
                    aria-hidden
                  />
                  {s.label}
                </span>
                <span className="tabular-nums font-semibold text-foreground">
                  {s.value}
                </span>
              </li>
            ))}
          </ul>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Teams
          </p>
          <h2 className="mb-3 text-base font-bold tracking-tight text-foreground">
            Evaluation status
          </h2>
          <CompositionDonut
            slices={teamStatus.slices}
            centerValue={teamStatus.total}
            centerLabel="Teams"
            ariaLabel={`Complete ${teamStatus.complete}, partial ${teamStatus.partial}, not evaluated ${teamStatus.none}`}
          />
          <ul className="mt-4 space-y-2 text-sm">
            {teamStatus.slices.map((s) => (
              <li
                key={s.key}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: s.color }}
                    aria-hidden
                  />
                  {s.label}
                </span>
                <span className="tabular-nums font-semibold text-foreground">
                  {s.value}
                </span>
              </li>
            ))}
          </ul>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Snapshot
          </p>
          <h2 className="mb-4 text-base font-bold tracking-tight text-foreground">
            Live counts
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <KpiTile
              label="Teams"
              value={overall.teamCount}
              icon={Users}
              tone="gold"
            />
            <KpiTile
              label="Judges"
              value={overall.judgeCount}
              icon={Gavel}
              tone="teal"
            />
            <KpiTile
              label="Groups"
              value={overall.groupCount}
              icon={Layers}
              tone="blue"
            />
            <KpiTile
              label="Pending"
              value={overall.pending}
              icon={Clock}
              tone="alert"
            />
          </div>
          <div className="mt-4 space-y-2">
            <HorizBar
              label="Submitted"
              value={overall.submitted}
              max={Math.max(1, overall.expected)}
              color="var(--tertiary)"
            />
            <HorizBar
              label="In progress"
              value={overall.draft}
              max={Math.max(1, overall.expected)}
              color="var(--status-partial)"
            />
            <HorizBar
              label="Pending"
              value={overall.pending}
              max={Math.max(1, overall.expected)}
              color="color-mix(in srgb, var(--destructive) 50%, white)"
            />
          </div>
        </motion.article>
      </section>

      <section>
        <div className="flex flex-nowrap items-center gap-3">
          <span className="shrink-0 text-sm font-medium text-muted-foreground whitespace-nowrap">
            Sort by:
          </span>
          <Select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="h-10 min-w-[10rem] flex-1 rounded-md sm:max-w-[14rem] sm:flex-none"
            aria-label="Filter by group"
          >
            <option value="all">All Groups</option>
            {snapshot.groups.map(({ group }) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Group live status</h2>
        {filteredGroups.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No color groups for this event yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredGroups.map((g, i) => (
              <GroupLiveCard
                key={g.group.id}
                progress={g}
                index={i}
                reducedMotion={!!reducedMotion}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-nowrap items-center gap-3">
          <span className="shrink-0 text-sm font-medium text-muted-foreground whitespace-nowrap">
            Sort by:
          </span>
          <Select
            value={tab}
            onChange={(e) => setTab(e.target.value as Tab)}
            className="h-10 min-w-[8.5rem] shrink-0 rounded-md"
            aria-label="View by team or judge"
          >
            <option value="teams">By team</option>
            <option value="judges">By judge</option>
          </Select>
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              tab === "teams"
                ? "Search teams or projects…"
                : "Search judges…"
            }
            className="min-w-0 flex-1 max-w-sm"
            aria-label="Search monitor rows"
          />
        </div>

        {tab === "teams" ? (
          <TeamLiveTable rows={filteredTeams} />
        ) : (
          <JudgeLiveTable rows={filteredJudges} />
        )}
      </section>
    </div>
  );
}

type MixSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

function buildEvalMix(overall: MonitorSnapshot["overall"]) {
  const slices: MixSlice[] = [
    {
      key: "submitted",
      label: "Submitted",
      value: overall.submitted,
      color: "#2d8289",
    },
    {
      key: "draft",
      label: "In progress",
      value: overall.draft,
      color: "#cb5a08",
    },
    {
      key: "pending",
      label: "Pending",
      value: overall.pending,
      color: "color-mix(in srgb, #ba1a1a 45%, white)",
    },
  ].filter((s) => s.value > 0);

  if (slices.length === 0) {
    slices.push({
      key: "empty",
      label: "No activity",
      value: 1,
      color: "#e1e3e4",
    });
  }

  return { slices };
}

function buildTeamStatus(teams: MonitorTeamRow[]) {
  let complete = 0;
  let partial = 0;
  let none = 0;
  for (const t of teams) {
    if (t.expected <= 0) {
      none += 1;
      continue;
    }
    if (t.submitted >= t.expected) complete += 1;
    else if (t.submitted > 0 || t.draft > 0) partial += 1;
    else none += 1;
  }
  const total = complete + partial + none;
  const slices: MixSlice[] = [
    { key: "complete", label: "Complete", value: complete, color: "#2d8289" },
    { key: "partial", label: "Partial", value: partial, color: "#cb5a08" },
    {
      key: "none",
      label: "Not evaluated",
      value: none,
      color: "color-mix(in srgb, #ba1a1a 45%, white)",
    },
  ].filter((s) => s.value > 0);

  if (slices.length === 0) {
    slices.push({
      key: "empty",
      label: "No teams",
      value: 1,
      color: "#e1e3e4",
    });
  }

  return { complete, partial, none, total, slices };
}

function CompositionDonut({
  slices,
  centerValue,
  centerLabel,
  ariaLabel,
}: {
  slices: MixSlice[];
  centerValue: number;
  centerLabel: string;
  ariaLabel: string;
}) {
  const basis = Math.max(
    1,
    slices.reduce((sum, s) => sum + s.value, 0),
  );
  let cumulative = 0;
  const arcs = slices.map((s) => {
    const start = cumulative;
    cumulative += s.value / basis;
    return { ...s, start, end: cumulative };
  });
  const gradient = `conic-gradient(${arcs
    .map(
      (a) =>
        `${a.color} ${(a.start * 360).toFixed(2)}deg ${(a.end * 360).toFixed(2)}deg`,
    )
    .join(", ")})`;

  return (
    <div className="flex justify-center">
      <div
        className="relative size-36 rounded-full sm:size-40"
        style={{ background: gradient }}
        role="img"
        aria-label={ariaLabel}
      >
        <div className="absolute inset-[26%] flex flex-col items-center justify-center rounded-full bg-card">
          <span className="text-2xl font-bold tabular-nums text-foreground">
            {centerValue}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {centerLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  icon: Icon,
  tone = "gold",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "gold" | "teal" | "blue" | "alert";
}) {
  const tones = {
    gold: {
      card: "border-border bg-card",
      iconWrap:
        "bg-[color-mix(in_srgb,var(--cu-gold)_28%,white)] text-primary",
      value: "text-foreground",
    },
    teal: {
      card: "border-border bg-card",
      iconWrap:
        "bg-[color-mix(in_srgb,var(--tertiary)_18%,white)] text-tertiary",
      value: "text-foreground",
    },
    blue: {
      card: "border-border bg-card",
      iconWrap: "bg-sky-100 text-sky-700",
      value: "text-foreground",
    },
    alert: {
      card: "border-destructive/25 bg-[color-mix(in_srgb,var(--destructive)_6%,white)]",
      iconWrap:
        "bg-[color-mix(in_srgb,var(--destructive)_14%,white)] text-destructive",
      value: "text-destructive",
    },
  } as const;

  const t = tones[tone];

  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border px-2.5 py-2.5 shadow-sm",
        t.card,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            t.iconWrap,
          )}
          aria-hidden
        >
          <Icon className="size-4" strokeWidth={2} />
        </span>
        <p
          className={cn(
            "min-w-0 truncate text-right text-xl font-bold tabular-nums tracking-tight",
            t.value,
          )}
        >
          {value}
        </p>
      </div>
      <p className="mt-1.5 truncate text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function HorizBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min(100, (value / Math.max(1, max)) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-semibold text-foreground">
          {value}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 60%, white))`,
          }}
        />
      </div>
    </div>
  );
}

function GroupLiveCard({
  progress,
  index = 0,
  reducedMotion = false,
}: {
  progress: MonitorGroupProgress;
  index?: number;
  reducedMotion?: boolean;
}) {
  const token = getGroupColorToken(progress.group.color_key);
  const remaining = Math.max(0, progress.expected - progress.submitted);
  const done =
    progress.expected > 0 && progress.submitted >= progress.expected;
  const panelNumber = Math.max(1, progress.group.display_order || 1);

  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : {
              duration: 0.4,
              delay: index * 0.05,
              ease: [0.16, 1, 0.3, 1],
            }
      }
      whileHover={
        reducedMotion
          ? undefined
          : { y: -4, transition: { duration: 0.2 } }
      }
      className="flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <div className={cn("h-1 w-full shrink-0", token.barClass)} />

      <div
        className={cn(
          "flex items-start justify-between gap-2 px-4 py-3",
          token.bgClass,
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn("size-2.5 shrink-0 rounded-full", token.dotClass)}
              aria-hidden
            />
            <h3 className="truncate text-base font-bold tracking-tight text-foreground">
              {progress.group.name}
            </h3>
          </div>
          <p className="mt-0.5 pl-[18px] text-xs font-medium text-muted-foreground">
            Panel #{panelNumber}
            <span className="mx-1.5 text-border" aria-hidden>
              ·
            </span>
            {done ? "Complete" : "Active"}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-md border border-border/60 bg-card/80 px-2 py-0.5 text-[11px] font-bold tabular-nums shadow-sm backdrop-blur-sm">
          <span className={token.textClass}>{progress.percent}%</span>
        </span>
      </div>

      <div className="flex flex-1 flex-col px-4 py-3">
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5 shrink-0" aria-hidden />
            {progress.judgeCount} judge
            {progress.judgeCount === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Layers className="size-3.5 shrink-0" aria-hidden />
            {progress.teamCount} team
            {progress.teamCount === 1 ? "" : "s"}
          </span>
          {progress.draft > 0 ? (
            <span className="tabular-nums text-amber-700">
              {progress.draft} draft{progress.draft === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        <div
          className="h-2.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress.submitted}
          aria-valuemin={0}
          aria-valuemax={Math.max(1, progress.expected)}
          aria-label={`${progress.group.name} progress`}
        >
          <motion.div
            className={cn("h-full rounded-full", token.barClass)}
            initial={reducedMotion ? false : { width: 0 }}
            animate={{ width: `${Math.min(100, progress.percent)}%` }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : {
                    duration: 0.7,
                    ease: [0.16, 1, 0.3, 1],
                    delay: 0.1 + index * 0.04,
                  }
            }
          />
        </div>

        <div className="mt-3 space-y-1.5">
          <HorizBar
            label="Submitted"
            value={progress.submitted}
            max={Math.max(1, progress.expected)}
            color={GROUP_HEX[progress.group.color_key] ?? "var(--cu-gold)"}
          />
          <HorizBar
            label="In progress"
            value={progress.draft}
            max={Math.max(1, progress.expected)}
            color="var(--status-partial)"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
        <span>
          <span className="font-semibold tabular-nums text-foreground">
            {progress.submitted}
          </span>
          /{progress.expected} evals
        </span>
        <span>
          <span
            className={cn(
              "font-semibold tabular-nums",
              remaining > 0 ? "text-foreground" : "text-tertiary",
            )}
          >
            {remaining}
          </span>{" "}
          remaining
        </span>
      </div>
    </motion.article>
  );
}

function TeamLiveTable({ rows }: { rows: MonitorTeamRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Team</th>
            <th className="px-4 py-3">Project</th>
            <th className="px-4 py-3">Groups</th>
            <th className="px-4 py-3">Progress</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-10 text-center text-muted-foreground"
              >
                No teams match this filter.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.team.id} className="border-t border-border">
                <td className="px-4 py-3 font-semibold">
                  {row.team.team_number}
                </td>
                <td className="px-4 py-3">
                  <p>{row.team.project_title}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.team.booth_location
                      ? row.team.booth_location.startsWith("Table") ||
                        row.team.booth_location.startsWith("Booth")
                        ? row.team.booth_location.replace(/^Booth\s*/i, "Table ")
                        : `Table ${row.team.booth_location}`
                      : "Table TBD"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {row.groups.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {row.groups.map((g) => (
                        <GroupBadge
                          key={g.id}
                          colorKey={g.color_key}
                          name={g.name}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Unassigned
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 min-w-[8rem]">
                  <div className="mb-1 text-xs tabular-nums text-muted-foreground">
                    {row.submitted}/{row.expected} ({row.percent}%)
                    {row.draft > 0 ? (
                      <span className="ml-2 text-amber-700">
                        {row.draft} draft
                      </span>
                    ) : null}
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cu-gold to-tertiary transition-[width] duration-500"
                      style={{ width: `${Math.min(100, row.percent)}%` }}
                    />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusChip
                    submitted={row.submitted}
                    expected={row.expected}
                    draft={row.draft}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function JudgeLiveTable({ rows }: { rows: MonitorJudgeRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Judge</th>
            <th className="px-4 py-3">Group</th>
            <th className="px-4 py-3">Progress</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-4 py-10 text-center text-muted-foreground"
              >
                No judges match this filter.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.judge.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <p className="font-medium">
                    {row.profile?.full_name ?? "Judge"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.profile?.email}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {row.group ? (
                    <GroupBadge
                      colorKey={row.group.color_key}
                      name={row.group.name}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 min-w-[8rem]">
                  <div className="mb-1 text-xs tabular-nums text-muted-foreground">
                    {row.submitted}/{row.expected} ({row.percent}%)
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cu-gold to-tertiary transition-[width] duration-500"
                      style={{ width: `${Math.min(100, row.percent)}%` }}
                    />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusChip
                    submitted={row.submitted}
                    expected={row.expected}
                    draft={row.draft}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusChip({
  submitted,
  expected,
  draft,
}: {
  submitted: number;
  expected: number;
  draft: number;
}) {
  if (expected === 0) {
    return (
      <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold uppercase">
        Unassigned
      </span>
    );
  }
  if (submitted >= expected) {
    return (
      <span className="rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-semibold uppercase text-emerald-900">
        Complete
      </span>
    );
  }
  if (draft > 0 || submitted > 0) {
    return (
      <span className="rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold uppercase text-amber-900">
        In progress
      </span>
    );
  }
  return (
    <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold uppercase text-muted-foreground">
      Pending
    </span>
  );
}

function filterTeams(
  rows: MonitorTeamRow[],
  groupFilter: string,
  query: string,
) {
  const q = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (groupFilter !== "all") {
      if (row.groups.length === 0) return false;
      const matches = row.groups.some(
        (g) => g.id === groupFilter || g.color_key === groupFilter,
      );
      if (!matches) return false;
    }
    if (!q) return true;
    return (
      row.team.team_number.toLowerCase().includes(q) ||
      row.team.project_title.toLowerCase().includes(q) ||
      row.groups.some((g) => g.name.toLowerCase().includes(q))
    );
  });
}

function filterJudges(
  rows: MonitorJudgeRow[],
  groupFilter: string,
  query: string,
) {
  const q = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (groupFilter !== "all") {
      if (!row.group) return false;
      if (
        row.group.id !== groupFilter &&
        row.group.color_key !== groupFilter
      ) {
        return false;
      }
    }
    if (!q) return true;
    const name = row.profile?.full_name?.toLowerCase() ?? "";
    const email = row.profile?.email?.toLowerCase() ?? "";
    return (
      name.includes(q) ||
      email.includes(q) ||
      (row.group?.name.toLowerCase().includes(q) ?? false)
    );
  });
}
