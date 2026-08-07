import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { EphemeralSessionGuard } from "@/components/shared/ephemeral-session-guard";
import { ServiceWorkerRegister } from "@/components/shared/service-worker-register";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CEDC Expo",
    template: "%s | CEDC Expo",
  },
  description:
    "CEDC Expo — Capstone Design Expo judging and evaluation for CU Denver College of Engineering, Design and Computing",
  applicationName: "CEDC Expo",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CEDC Expo",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#d4b773",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} min-h-svh`}
      suppressHydrationWarning
    >
      <body className="flex min-h-svh max-w-[100dvw] flex-col overflow-x-clip">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <ServiceWorkerRegister />
        <EphemeralSessionGuard />
        <div id="main-content" className="flex min-h-svh min-w-0 max-w-full flex-1 flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
