"use client";

import { useEffect, useState } from "react";

const DEFAULT_MS = 2500;

/**
 * Flips true after `pending` stays true past a threshold — slow-network cue.
 */
export function useSlowPending(pending: boolean, delayMs = DEFAULT_MS) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!pending) {
      setSlow(false);
      return;
    }
    const id = window.setTimeout(() => setSlow(true), delayMs);
    return () => window.clearTimeout(id);
  }, [pending, delayMs]);

  return slow;
}
