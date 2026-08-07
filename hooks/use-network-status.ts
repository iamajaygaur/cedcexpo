"use client";

import { useEffect, useState } from "react";

/**
 * Lightweight online/offline indicator for Expo Wi-Fi resilience UX.
 * Does not sync data — Phase 6/10 will pair with draft recovery.
 */
export function useNetworkStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    function sync() {
      setOnline(navigator.onLine);
    }
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return { online };
}
