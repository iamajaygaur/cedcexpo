/**
 * App SemVer — read directly from package.json so the UI matches the cut
 * that was compiled (no stale next.config-only env cache).
 * Bump package.json (+ CHANGELOG + lockfile root version) when releasing;
 * restart local / redeploy production to show the new badge.
 */
import packageJson from "../package.json";

export const APP_VERSION =
  typeof packageJson.version === "string" && packageJson.version.trim()
    ? packageJson.version.trim()
    : "0.0.0";

/** Display label, e.g. `v1.1.1`. */
export const APP_VERSION_LABEL = `v${APP_VERSION}`;
