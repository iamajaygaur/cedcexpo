import { Loader2 } from "lucide-react";

export default function AdminLoading() {
  return (
    <div
      className="flex min-h-[40vh] flex-1 flex-col items-center justify-center gap-3 px-4"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-7 animate-spin text-primary" aria-hidden />
      <p className="text-sm font-medium text-muted-foreground">Loading…</p>
    </div>
  );
}
