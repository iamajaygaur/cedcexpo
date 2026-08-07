/**
 * Clears browser-only leftovers after sign-out / account switch.
 * Safe to call from the client; no-ops when window is unavailable.
 */
export function clearClientAuthArtifacts(): void {
  if (typeof window === "undefined") return;

  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith("cedc-eval-draft-")) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore storage access errors (private mode, etc.).
  }
}
