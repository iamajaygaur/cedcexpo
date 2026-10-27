"use client";

import { motion, useReducedMotion } from "motion/react";
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
  const reduced = useReducedMotion();
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
        <motion.div
          className="relative size-40 rounded-full shadow-sm sm:size-44"
          style={{ background: gradient }}
          role="img"
          aria-label="Department breakdown by evaluated teams"
          initial={reduced ? false : { scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="absolute inset-[26%] flex flex-col items-center justify-center rounded-full bg-card shadow-inner">
            <span className="font-heading text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-3xl">
              {centerTotal}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Evals
            </span>
          </div>
        </motion.div>
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
                    className="group border-t border-border/60"
                  >
                    <td className="py-2.5 pr-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full ring-1 ring-black/5 transition-transform duration-200 group-hover:scale-110"
                          style={{ background: color }}
                          aria-hidden
                        />
                        <span className="truncate font-medium text-foreground">
                          {slice.category}
                        </span>
                      </span>
                    </td>
                    <td className="relative py-2.5 pr-2">
                      <div className="flex min-w-[5.5rem] items-center gap-2">
                        <div className="relative h-1.5 flex-1 overflow-visible rounded-full bg-muted">
                          <span className="chart-tooltip left-1/2">
                            {slice.category}: {Math.round(pct)}% · n=
                            {slice.evaluatedCount}
                          </span>
                          <div
                            className="chart-bar h-full rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(0, pct))}%`,
                              background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 55%, white))`,
                              transformOrigin: "left center",
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
