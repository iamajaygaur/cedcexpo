import { cn } from "@/lib/utils";

type RankMedalProps = {
  rank: number;
  className?: string;
};

const MEDAL_FILL: Record<1 | 2 | 3, string> = {
  1: "#D4A017",
  2: "#A8A8A8",
  3: "#C47A3A",
};

/**
 * Ribbon + circular medal for competition ranks 1–3.
 * Ranks outside 1–3 render as plain bold text.
 */
export function RankMedal({ rank, className }: RankMedalProps) {
  if (rank !== 1 && rank !== 2 && rank !== 3) {
    return (
      <span
        className={cn(
          "inline-flex min-w-8 items-center justify-center text-sm font-bold tabular-nums",
          className,
        )}
      >
        {rank}
      </span>
    );
  }

  const fill = MEDAL_FILL[rank];

  return (
    <span
      className={cn("inline-flex items-center justify-center", className)}
      role="img"
      aria-label={`Rank ${rank}`}
    >
      <svg
        width="36"
        height="40"
        viewBox="0 0 36 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        {/* Tri-color ribbon */}
        <path d="M11 0h4l1.5 10H9.5L11 0Z" fill="#1E4D8C" />
        <path d="M16 0h4l1.5 10h-7L16 0Z" fill="#F5F5F5" />
        <path d="M21 0h4l-1.5 10H19.5L21 0Z" fill="#C62828" />
        {/* Medal disc */}
        <circle cx="18" cy="24" r="14" fill={fill} />
        <circle
          cx="18"
          cy="24"
          r="11.5"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1.5"
        />
        <text
          x="18"
          y="24"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#FFFFFF"
          fontSize="14"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          {rank}
        </text>
      </svg>
    </span>
  );
}
