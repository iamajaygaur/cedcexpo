import type { MetadataRoute } from "next";

/**
 * Installable PWA manifest.
 * Do NOT register a service worker that caches authenticated evaluation APIs.
 * Static icons / shell only — eval data stays network-first (Phase 10 may add a
 * carefully scoped SW that excludes /admin, /judge, /api).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CEDC Capstone Design Expo Judging",
    short_name: "CEDC Expo",
    description:
      "University of Colorado Denver — College of Engineering, Design and Computing Capstone Design Expo judging PWA",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f9fa",
    theme_color: "#d4b773",
    orientation: "any",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
