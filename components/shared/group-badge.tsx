import { getGroupColorToken } from "@/lib/groups/color-tokens";
import { cn } from "@/lib/utils";

type GroupBadgeProps = {
  colorKey: string;
  /** Override label; defaults to token label e.g. "Red Group" */
  name?: string;
  className?: string;
};

/**
 * Always shows text + color — never color alone.
 */
export function GroupBadge({ colorKey, name, className }: GroupBadgeProps) {
  const token = getGroupColorToken(colorKey);
  const label = name ?? token.label;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wider",
        token.bgClass,
        token.textClass,
        className,
      )}
    >
      <span
        className={cn("size-2 rounded-full", token.dotClass)}
        aria-hidden
      />
      <span>{label}</span>
    </span>
  );
}
