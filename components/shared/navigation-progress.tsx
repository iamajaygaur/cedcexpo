"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Thin top progress bar while navigating between pages.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [complete, setComplete] = useState(false);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    setComplete(true);
    const done = window.setTimeout(() => {
      setVisible(false);
      setComplete(false);
    }, 280);
    return () => window.clearTimeout(done);
  }, [pathname, searchParams]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const next = `${url.pathname}${url.search}`;
      const current = `${window.location.pathname}${window.location.search}`;
      if (next === current) return;

      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      setComplete(false);
      setVisible(true);
    }

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  if (!visible && !complete) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5 overflow-hidden"
      aria-hidden
    >
      <div
        className={cn(
          "h-full origin-left bg-primary transition-transform duration-300 ease-out",
          complete ? "scale-x-100 opacity-0 duration-200" : "animate-nav-progress",
        )}
      />
    </div>
  );
}
