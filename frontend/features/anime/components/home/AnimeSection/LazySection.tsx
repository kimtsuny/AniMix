"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";
import AnimeSectionSkeleton from "./AnimeSectionSkeleton";

interface LazySectionProps {
  /** The section component to render once visible */
  children: ReactNode;
  /** Optional title to show on the skeleton while loading */
  title?: string;
  /** How far before entering viewport to trigger mount (px). Defaults to 400. */
  rootMargin?: number;
}

export default function LazySection({
  children,
  title,
  rootMargin = 400,
}: LazySectionProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: `${rootMargin}px 0px`,
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin]);

  if (isVisible) {
    return <>{children}</>;
  }

  return (
    <div ref={sentinelRef}>
      <AnimeSectionSkeleton title={title} />
    </div>
  );
}
