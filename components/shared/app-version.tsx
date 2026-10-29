import { APP_VERSION, APP_VERSION_LABEL } from "@/lib/app-version";
import { cn } from "@/lib/utils";

type AppVersionProps = {
  className?: string;
  /** `muted` for footers; `sidebar` for dark glass nav */
  tone?: "muted" | "sidebar";
};

/**
 * Visible build version. Keep in sync by bumping package.json on release.
 */
export function AppVersion({ className, tone = "muted" }: AppVersionProps) {
  return (
    <span
      className={cn(
        "tabular-nums tracking-wide",
        tone === "sidebar"
          ? "text-[10px] text-sidebar-foreground/35"
          : "text-[11px] text-muted-foreground/70",
        className,
      )}
      title={`CEDC Expo ${APP_VERSION_LABEL}`}
    >
      {APP_VERSION_LABEL}
      <span className="sr-only"> (version {APP_VERSION})</span>
    </span>
  );
}
