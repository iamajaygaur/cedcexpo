"use client";

import type { ScoreDistributionBucket } from "@/lib/admin/report-analytics";
import { cn } from "@/lib/utils";

type ScoreDistributionChartProps = {
  buckets: ScoreDistributionBucket[];
  maxCount: number;
};

export function ScoreDistributionChart({
  buckets,
  maxCount,
}: ScoreDistributionChartProps) {
  const chartMax = Math.max(1, maxCount);
  const peak = Math.max(0, ...buckets.map((b) => b.count));
  const yTicks = [chartMax, Math.round(chartMax * 0.66), Math.round(chartMax * 0.33), 0];

  return (
    <div className="relative mt-4 h-56 sm:h-60">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex w-6 flex-col justify-between pb-8 text-[10px] tabular-nums text-muted-foreground">
        {yTicks.map((tick, i) => (
          <span key={`${tick}-${i}`}>{tick}</span>
        ))}
      </div>

      <div className="ml-7 h-full">
        <div className="pointer-events-none absolute inset-x-7 top-0 bottom-8 flex flex-col justify-between">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border-t border-dashed border-border/70" />
          ))}
        </div>

        <div className="relative flex h-full items-end justify-between gap-2 px-1 sm:gap-3 sm:px-2">
          {buckets.map((bucket) => {
            const heightPct = (bucket.count / chartMax) * 100;
            const isPeak = bucket.count > 0 && bucket.count === peak;

            return (
              <div
                key={bucket.key}
                className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
              >
                <div className="relative flex w-full flex-1 items-end justify-center">
                  {bucket.count > 0 ? (
                    <span className="absolute -top-5 text-[11px] font-semibold tabular-nums text-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:opacity-100">
                      {bucket.count}
                    </span>
                  ) : null}
                  <div
                    className={cn(
                      "w-full max-w-[2.85rem] rounded-t-lg transition-[height] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                      bucket.count === 0 && "bg-muted",
                    )}
                    style={
                      bucket.count === 0
                        ? {
                            height: "4%",
                          }
                        : {
                            height: `${Math.max(8, heightPct)}%`,
                            background: isPeak
                              ? "linear-gradient(180deg, var(--primary) 0%, var(--cu-gold) 100%)"
                              : "linear-gradient(180deg, color-mix(in srgb, var(--cu-gold) 88%, white) 0%, var(--cu-gold) 100%)",
                          }
                    }
                    title={`${bucket.label}: ${bucket.count}`}
                  />
                </div>
                <span className="shrink-0 text-center text-[11px] font-medium text-muted-foreground sm:text-xs">
                  {bucket.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
