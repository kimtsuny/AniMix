"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
  const pathname = usePathname();
  const prevPathnameRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;

    // Do not scroll to top when switching episodes or seasons on the watch page for the same anime
    if (prev && pathname) {
      const prevMatch = prev.match(/^\/watch\/([^/]+)/);
      const currMatch = pathname.match(/^\/watch\/([^/]+)/);

      if (prevMatch && currMatch && prevMatch[1] === currMatch[1]) {
        return;
      }
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [pathname]);

  return null;
}