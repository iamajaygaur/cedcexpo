import os from "node:os";
import type { NextConfig } from "next";

/**
 * Phones on Wi‑Fi hit the Mac via LAN IP (192.168.x.x), not localhost.
 * Next 16 blocks /_next/* for unknown hosts unless listed here — without
 * that, React never hydrates and menus/tabs look broken on real devices.
 *
 * Wildcard private ranges so any Wi‑Fi subnet works without editing config
 * each time the Mac gets a new DHCP address. Patterns use the same matcher
 * as Next CSRF (`192.168.*.*` → four octets).
 */
function lanDevOrigins(): string[] {
  const hosts = new Set<string>([
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    // Private LAN wildcards (phone → Mac via Network URL)
    "192.168.*.*",
    "10.*.*.*",
    "172.16.*.*",
    "172.17.*.*",
    "172.18.*.*",
    "172.19.*.*",
    "172.20.*.*",
    "172.21.*.*",
    "172.22.*.*",
    "172.23.*.*",
    "172.24.*.*",
    "172.25.*.*",
    "172.26.*.*",
    "172.27.*.*",
    "172.28.*.*",
    "172.29.*.*",
    "172.30.*.*",
    "172.31.*.*",
  ]);

  try {
    for (const entries of Object.values(os.networkInterfaces())) {
      for (const entry of entries ?? []) {
        const family = String(entry.family);
        if ((family === "IPv4" || family === "4") && !entry.internal) {
          hosts.add(entry.address);
        }
      }
    }
  } catch {
    // keep wildcards + defaults
  }

  const fromEnv = process.env.ALLOWED_DEV_ORIGINS?.split(",") ?? [];
  for (const raw of fromEnv) {
    const value = raw.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (value) hosts.add(value);
  }

  return [...hosts];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: lanDevOrigins(),

  // Prevent accidental caching of authenticated responses at the CDN/edge layer.
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/judge/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
