"use client";

import { useEffect } from "react";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/shared/ui-states";

export default function JudgeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[JudgeError]", error);
  }, [error]);

  return (
    <ErrorPanel
      title="Judge workspace error"
      description="Something went wrong while loading this page. Try again — your draft scores on this device are still safe."
      digest={error.digest}
      onRetry={reset}
      secondaryAction={
        <Button asChild variant="outline">
          <Link href="/judge/dashboard" className="gap-2">
            <LayoutDashboard className="size-4" aria-hidden />
            Back to Dashboard
          </Link>
        </Button>
      }
    />
  );
}
