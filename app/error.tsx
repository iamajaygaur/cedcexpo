"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ErrorPanel } from "@/components/shared/ui-states";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Error]", error);
  }, [error]);

  return (
    <ErrorPanel
      className="min-h-[60dvh]"
      title="Something went wrong"
      description="An unexpected error occurred while loading this page. Try again or navigate to a known section."
      digest={error.digest}
      onRetry={reset}
      secondaryAction={
        <Button asChild variant="outline">
          <Link href="/" className="gap-2">
            <Home className="size-4" aria-hidden />
            Back to Home
          </Link>
        </Button>
      }
    />
  );
}
