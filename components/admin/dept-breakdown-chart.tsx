"use client";

import type { DeptBreakdownSlice } from "@/lib/admin/report-analytics";
import { cn } from "@/lib/utils";

/** CEDC-aligned chart palette (gold → teal → charcoal → warm neutrals). */
const SLICE_COLORS = [
  "#cfb87c",
  "#2d8289",
  "#725c21",
  "#5e5e5e",
  "#a67c52",
  "#8fa08a",
  "#3a3f45",
  "#c5c9ce",
] as const;

type DeptBreakdownChartProps = {
  slices: DeptBreakdownSlice[];
  centerTotal: number;
};

export function DeptBreakdownChart({
  slices,
  centerTotal,
}: DeptBreakdownChartProps) {
  const withShare = slices.filter((s) => s.evaluatedCount > 0);
  const fallback =
    withShare.length > 0
      ? withShare
      : slices.map((s) => ({
          ...s,
          evaluatedCount: s.teamCount || 0,
          sharePercent:
            slices.reduce((n, x) => n + x.teamCount, 0) > 0
              ? (s.teamCount /
                  Math.max(
                    1,
                    slices.reduce((n, x) => n + x.teamCount, 0),
                  )) *
                100
              : 0,
        }));

  const basis =
    fallback.reduce((sum, s) => sum + Math.max(s.evaluatedCount, 0), 0) || 1;

  let cumulative = 0;
  const arcs = fallback
    .filter((s) => s.evaluatedCount > 0 || withShare.length === 0)
    .map((slice, index) => {
      const value = Math.max(slice.evaluatedCount, 0) / basis;
      const start = cumulative;
      cumulative += value;
      return {
        ...slice,
        start,
        end: cumulative,
        color: SLICE_COLORS[index % SLICE_COLORS.length]!,
        percent: slice.sharePercent || value * 100,
      };
    })
    .filter((a) => a.end > a.start);

  const gradient =
    arcs.length === 0
      ? "conic-gradient(#e8eaed 0deg 360deg)"
      : `conic-gradient(${arcs
          .map((a) => `${a.color} ${a.start * 360}deg ${a.end * 360}deg`)
          .join(", ")})`;

  const tableRows =
    withShare.length > 0 ? withShare : slices.filter((s) => s.teamCount > 0);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <div className="mx-auto flex shrink-0 flex-col items-center lg:mx-0">
        <div
          className="relative size-40 rounded-full sm:size-44"
          style={{ background: gradient }}
          role="img"
          aria-label="Department breakdown by evaluated teams"
        >
          <div className="absolute inset-[26%] flex flex-col items-center justify-center rounded-full bg-card">
            <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-3xl">
              {centerTotal}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Evals
            </span>
          </div>
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-x-auto">
        {tableRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No departments yet.
          </p>
        ) : (
          <table className="w-full min-w-[16rem] text-left text-sm">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 pr-2 font-semibold">Dept</th>
                <th className="pb-2 pr-2 font-semibold">Share</th>
                <th className="pb-2 text-right font-semibold">Avg %</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((slice, index) => {
                const pct =
                  withShare.length > 0
                    ? slice.sharePercent
                    : slice.sharePercent || 0;
                const color = SLICE_COLORS[index % SLICE_COLORS.length]!;
                return (
                  <tr
                    key={slice.category}
                    className="border-t border-border/60"
                  >
                    <td className="py-2.5 pr-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: color }}
                          aria-hidden
                        />
                        <span className="truncate font-medium text-foreground">
                          {slice.category}
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-2">
                      <div className="flex min-w-[5.5rem] items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                            style={{
                              width: `${Math.min(100, Math.max(0, pct))}%`,
                              background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 55%, white))`,
                            }}
                          />
                        </div>
                        <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                          {Math.round(pct)}%
                        </span>
                      </div>
                    </td>
                    <td
                      className={cn(
                        "py-2.5 text-right tabular-nums font-semibold",
                        slice.evaluatedCount > 0
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {slice.evaluatedCount > 0
                        ? `${slice.averagePercent.toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
