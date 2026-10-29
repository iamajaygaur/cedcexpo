/**
 * App SemVer — sourced from package.json via next.config `env` injection.
 * Bump package.json (+ CHANGELOG) when cutting a release; the UI follows.
 */
export const APP_VERSION =
  process.env.NEXT_PUBLIC_APP_VERSION?.trim() || "0.0.0";

/** Display label, e.g. `v1.0.1`. */
export const APP_VERSION_LABEL = `v${APP_VERSION}`;
