"use client";

import { useEffect } from "react";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/shared/ui-states";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AdminError]", error);
  }, [error]);

  return (
    <ErrorPanel
      title="Admin error"
      description="Something went wrong in CEDC Expo. This has been logged. Try again or return to the dashboard."
      digest={error.digest}
      onRetry={reset}
      secondaryAction={
        <Button asChild variant="outline">
          <Link href="/admin/dashboard" className="gap-2">
            <LayoutDashboard className="size-4" aria-hidden />
            Back to Dashboard
          </Link>
        </Button>
      }
    />
  );
}
