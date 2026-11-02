"use client";

import { useEffect, useState } from "react";

type NetworkConnection = {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

function readSlow(connection: NetworkConnection | undefined): boolean {
  if (!connection) return false;
  if (connection.saveData) return true;
  const type = connection.effectiveType;
  return type === "slow-2g" || type === "2g";
}

/**
 * Online/offline + coarse slow-network signal for Expo Wi‑Fi UX.
 */
export function useNetworkStatus() {
  const [online, setOnline] = useState(true);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    function syncOnline() {
      setOnline(navigator.onLine);
    }

    function syncConnection() {
      const connection = (
        navigator as Navigator & { connection?: NetworkConnection }
      ).connection;
      setSlow(readSlow(connection));
    }

    syncOnline();
    syncConnection();

    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);

    const connection = (
      navigator as Navigator & { connection?: NetworkConnection }
    ).connection;
    connection?.addEventListener?.("change", syncConnection);

    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
      connection?.removeEventListener?.("change", syncConnection);
    };
  }, []);

  return { online, slow };
}
