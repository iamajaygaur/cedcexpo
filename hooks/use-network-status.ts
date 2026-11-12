"use client";

import { useEffect } from "react";

import { useMachine } from "@/lib/fsm";
import {
  networkStatusFromFlags,
  networkStatusMachine,
} from "@/lib/machines/network-status";

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
 * Backed by `networkStatusMachine`: online | slow | offline.
 */
export function useNetworkStatus() {
  const { state, send } = useMachine(networkStatusMachine);

  useEffect(() => {
    function sync() {
      const connection = (
        navigator as Navigator & { connection?: NetworkConnection }
      ).connection;
      const next = networkStatusFromFlags(
        navigator.onLine,
        readSlow(connection),
      );
      if (next === "offline") send("OFFLINE");
      else if (next === "slow") send("SLOW");
      else send("ONLINE");
    }

    sync();

    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);

    const connection = (
      navigator as Navigator & { connection?: NetworkConnection }
    ).connection;
    connection?.addEventListener?.("change", sync);

    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      connection?.removeEventListener?.("change", sync);
    };
  }, [send]);

  return {
    online: state !== "offline",
    slow: state === "slow",
    status: state,
  };
}
