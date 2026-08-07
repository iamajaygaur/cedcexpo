"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Optional install affordance for supporting browsers.
 * iOS users still use Share → Add to Home Screen.
 */
export function PwaInstallHint() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [dismissed, setDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua);
    setIsIos(ios);
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Boolean((window.navigator as any).standalone),
    );

    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (standalone || dismissed) return null;

  if (deferred) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
        <span>Install CEDC Expo for quicker judging access.</span>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className="min-h-10"
            onClick={async () => {
              await deferred.prompt();
              setDeferred(null);
            }}
          >
            Install
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
          >
            Not now
          </Button>
        </div>
      </div>
    );
  }

  if (isIos) {
    return (
      <div className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
        On iPhone/iPad: tap Share, then{" "}
        <strong className="text-foreground">Add to Home Screen</strong> for the
        installable PWA.
      </div>
    );
  }

  return null;
}
