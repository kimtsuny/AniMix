"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RecommendationCard } from "./RecommendationCard";
import type { MockRecommendation } from "@/features/watch/data/mock-data";

interface YouMightLikeProps {
  recommendations: MockRecommendation[];
}

export function YouMightLike({ recommendations }: YouMightLikeProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 10);
    setCanScrollNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const scroll = useCallback((direction: "prev" | "next") => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.7;
    el.scrollBy({
      left: direction === "next" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  }, []);

  if (!recommendations.length) return null;

  return (
    <section className="py-5 md:py-6">
      <h2 className="text-white text-base md:text-lg font-semibold mb-4">
        You Might Like
      </h2>

      <div className="relative">
        {/* Navigation arrows */}
        <button
          onClick={() => scroll("prev")}
          disabled={!canScrollPrev}
          className="absolute left-0 top-1/3 -translate-y-1/2 -translate-x-1/2 z-10 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/10 items-center justify-center text-white transition-all hover:bg-black/80 disabled:opacity-0 disabled:pointer-events-none hidden md:flex"
          aria-label="Scroll to previous recommendations"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          onClick={() => scroll("next")}
          disabled={!canScrollNext}
          className="absolute right-0 top-1/3 -translate-y-1/2 translate-x-1/2 z-10 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/10 items-center justify-center text-white transition-all hover:bg-black/80 disabled:opacity-0 disabled:pointer-events-none hidden md:flex"
          aria-label="Scroll to next recommendations"
        >
          <ChevronRight className="size-5" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-3 md:gap-4 overflow-x-auto pb-2"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {recommendations.map((anime) => (
            <RecommendationCard key={anime.id} anime={anime} />
          ))}
        </div>
      </div>
    </section>
  );
}
