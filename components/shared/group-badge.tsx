import { getGroupColorToken } from "@/lib/groups/color-tokens";
import { cn } from "@/lib/utils";

type GroupBadgeProps = {
  colorKey: string;
  /** Override label; defaults to token label e.g. "Red" */
  name?: string;
  className?: string;
  /** Compact for dense tables */
  size?: "sm" | "md";
};

/**
 * Always shows text + color — never color alone.
 * Quiet institutional chip (hairline border, soft tint) — not candy rainbow pills.
 */
export function GroupBadge({
  colorKey,
  name,
  className,
  size = "md",
}: GroupBadgeProps) {
  const token = getGroupColorToken(colorKey);
  const label = name ?? token.label;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border font-semibold tracking-wide",
        token.bgClass,
        token.textClass,
        token.ringClass,
        size === "sm"
          ? "rounded-md px-2 py-0.5 text-[10px]"
          : "rounded-md px-2.5 py-1 text-[11px]",
        className,
      )}
    >
      <span
        className={cn(
          "shrink-0 rounded-full",
          size === "sm" ? "size-1.5" : "size-2",
          token.dotClass,
        )}
        aria-hidden
      />
      <span>{label}</span>
    </span>
  );
}
