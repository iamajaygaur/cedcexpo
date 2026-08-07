"use client";

import { useEffect } from "react";

/**
 * Registers a minimal service worker that caches static assets only.
 * Authenticated routes (/admin, /judge, /api, /login) are never cached.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        // Install still works via manifest without SW
      });
  }, []);

  return null;
}
