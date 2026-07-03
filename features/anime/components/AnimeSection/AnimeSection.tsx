"use client";

import Link from "next/link";
import { useCallback, useId, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { A11y, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperInstance } from "swiper";
import { cn } from "@/shared/lib/utils";
import AnimeCard from "./AnimeCard";
import "swiper/css";
import { mockRecentlyAdded } from "../../data/mockRecentlyAdded";

export default function AnimeSection() {
    const swiperRef = useRef<SwiperInstance | null>(null);
    const swiperId = useId().replace(/:/g, "");
    const prevButtonClass = `anime-section-prev-${swiperId}`;
    const nextButtonClass = `anime-section-next-${swiperId}`;

    const handleSwiper = useCallback((swiper: SwiperInstance) => {
        swiperRef.current = swiper;
    }, []);

    return (
        <section className="group/section relative w-full space-y-5 ">
            <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">
                    Trending Now
                </h2>

                <Link
                    href="/anime"
                    aria-label="View all recently added anime"
                    className="group/see-all inline-flex shrink-0 items-center gap-1 text-sm font-medium text-white/60 transition-colors duration-250 hover:text-white"
                >
                    <span>See All</span>
                    <ChevronRight className="h-4 w-4 transition-transform duration-250 group-hover/see-all:translate-x-0.5" />
                </Link>
            </div>

            <div className="relative">
                <Swiper
                    modules={[A11y, Navigation]}
                    navigation={{
                        prevEl: `.${prevButtonClass}`,
                        nextEl: `.${nextButtonClass}`,
                    }}
                    slidesPerView={2}
                    spaceBetween={12}
                    speed={500}
                    grabCursor
                    watchOverflow
                    onSwiper={handleSwiper}
                    breakpoints={{
                        320: {
                            slidesPerView: 2,
                            spaceBetween: 12,
                        },
                        768: {
                            slidesPerView: 3,
                            spaceBetween: 14,
                        },
                        1024: {
                            slidesPerView: 4,
                            spaceBetween: 14,
                        },
                        1280: {
                            slidesPerView: 8,
                            spaceBetween: 16,
                        },
                    }}
                    className="w-full"
                >
                    {mockRecentlyAdded.map((anime) => (
                        <SwiperSlide key={anime.id} className="!h-auto">
                            <AnimeCard anime={anime} />
                        </SwiperSlide>
                    ))}
                </Swiper>

                <button
                    type="button"
                    aria-label="Previous anime"
                    onClick={() => swiperRef.current?.slidePrev()}
                    className={cn(
                        prevButtonClass,
                        "absolute left-0 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full",
                        "border border-white/10 bg-black/50 text-white backdrop-blur-md transition-all duration-300",
                        "hover:scale-105 hover:bg-black/65",
                        "opacity-0 pointer-events-none group-hover/section:opacity-100 group-hover/section:pointer-events-auto md:flex"
                    )}
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                    type="button"
                    aria-label="Next anime"
                    onClick={() => swiperRef.current?.slideNext()}
                    className={cn(
                        nextButtonClass,
                        "absolute right-0 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full",
                        "border border-white/10 bg-black/50 text-white backdrop-blur-md transition-all duration-300",
                        "hover:scale-105 hover:bg-black/65",
                        "opacity-0 pointer-events-none group-hover/section:opacity-100 group-hover/section:pointer-events-auto md:flex"
                    )}
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </section>
    );
}
