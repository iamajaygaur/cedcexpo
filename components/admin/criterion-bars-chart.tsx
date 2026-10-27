"use client";

import type { CriterionBar } from "@/lib/admin/report-analytics";

type CriterionBarsChartProps = {
  bars: CriterionBar[];
};

/** Horizontal bars for criterion averages (/10 → %). */
export function CriterionBarsChart({ bars }: CriterionBarsChartProps) {
  if (bars.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No criterion scores yet. Submit evaluations to populate this chart.
      </p>
    );
  }

  return (
    <ul className="mt-2 space-y-4">
      {bars.map((bar) => (
        <li key={bar.name} className="group relative">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-medium text-foreground">
              {bar.name}
            </span>
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
              <span className="font-semibold text-foreground">
                {bar.averageScore.toFixed(1)}
              </span>
              /{bar.maxScore.toFixed(0)}
            </span>
          </div>
          <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="chart-bar h-full rounded-full"
              style={{
                width: `${Math.min(100, Math.max(0, bar.percent))}%`,
                background:
                  "linear-gradient(90deg, var(--cu-gold) 0%, var(--tertiary) 100%)",
                transformOrigin: "left center",
              }}
              aria-label={`${bar.name}: ${bar.averageScore.toFixed(1)} of ${bar.maxScore}`}
            />
            <span className="chart-tooltip left-1/2">
              {bar.name}: {bar.percent.toFixed(0)}% · n={bar.sampleCount}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
