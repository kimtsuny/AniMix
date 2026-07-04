"use client";

import { useEffect, useState, useCallback, memo } from "react";
import Autoplay from "embla-carousel-autoplay";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    type CarouselApi,
} from "@/shared/components/ui/carousel";
import { cn } from "@/shared/lib/utils";
import HeroSlide from "./HeroSlide";
import HeroContent from "./HeroContent";
import ActionButtons from "./ActionButtons";
import { useHeroAnime } from "../../hooks/useHeroAnime";

function HeroCarousel() {
    const { data, loading, error } = useHeroAnime();
    
    const [api, setApi] = useState<CarouselApi>();
    const [current, setCurrent] = useState(0);
    const [count, setCount] = useState(0);

    const onSelect = useCallback((api: CarouselApi) => {
        if (!api) return;
        setCurrent(api.selectedScrollSnap());
    }, []);

    useEffect(() => {
        if (!api) {
            return;
        }

        queueMicrotask(() => {
            setCount(api.scrollSnapList().length);
            setCurrent(api.selectedScrollSnap());
        });

        api.on("select", onSelect);
        return () => {
            api.off("select", onSelect);
        };
    }, [api, onSelect]);

    const scrollTo = useCallback((index: number) => {
        api?.scrollTo(index);
    }, [api]);

    const activeSlide = data[current];

    const handleWatchNow = useCallback(() => {
        console.log(`Watch Now: ${activeSlide?.title}`);
    }, [activeSlide]);

    const handleMoreActions = useCallback(() => {
        console.log(`More Actions: ${activeSlide?.title}`);
    }, [activeSlide]);

    if (loading) {
    return (
        <section className="flex h-[88vh] items-center justify-center bg-black text-white">
            Loading...
        </section>
    );
}

if (error) {
    return (
        <section className="flex h-[88vh] items-center justify-center bg-black text-red-500">
            Failed to load hero anime.
        </section>
    );
}

    return (
        <section
            className="relative w-full min-h-[670px] lg:h-[88vh] bg-black overflow-hidden"
            aria-label="Anime Hero Carousel"
        >
            <Carousel
                setApi={setApi}

                className="h-full w-full"
            >
                <CarouselContent className="h-full -ml-0">
                    {data.map((slide, index) => (
                        <CarouselItem key={slide.id} className="h-full w-full pl-0 basis-full">
                            <HeroSlide
                                slide={slide}
                                priority={index === 0}
                            />
                        </CarouselItem>
                    ))}
                </CarouselContent>

                <div className="absolute bottom-6 md:bottom-10 left-6 md:left-22 right-6 md:right-6 z-30 flex items-end justify-between pointer-events-none select-none">
                    {/* Bottom Left: HeroContent + Action Buttons + Pagination Stack */}
                    <div className="flex flex-col items-start gap-7 max-w-[42rem] pointer-events-auto">
    {activeSlide && (
        <HeroContent slide={activeSlide} isActive={true} />
    )}

    {/* Action Buttons + Pagination */}
    <div className="flex flex-col items-start gap-4 w-fit">
        <ActionButtons
            onWatchNow={handleWatchNow}
            onMoreActions={handleMoreActions}
        />

        <div className="flex w-full gap-2">
            {Array.from({ length: count }).map((_, i) => (
                <button
                    key={i}
                    onClick={() => scrollTo(i)}
                    className="flex-1 flex justify-center"
                >
                    <span
                        className={cn(
                            "h-2 rounded-full transition-all duration-300",
                            current === i
                                ? "w-12 bg-white"
                                : "w-6 bg-white/35"
                        )}
                    />
                </button>
            ))}
        </div>
    </div>
</div>
                    {/* Bottom Right: Navigation Arrows */}
                   <div className="hidden md:flex items-center gap-3 pointer-events-auto -translate-x-16">
                        <CarouselPrevious
    variant="outline"
    className="
        h-10 w-10
border-0
        
        bg-black/70
        backdrop-blur-md
        text-white
        shadow-lg
        transition-all duration-300 ease-out
        hover:bg-white/20
        hover:text-white
        hover:scale-110
        active:scale-95
        cursor-pointer
        flex items-center justify-center
    "
/>

<CarouselNext
    variant="outline"
    className="
        h-10 w-10
        bg-black/70
        border-0
        backdrop-blur-md
        text-white
        shadow-lg
        transition-all duration-300 ease-out
        hover:bg-white/20
        hover:text-white
        hover:scale-110
        active:scale-95
        cursor-pointer
        flex items-center justify-center
    "
/>
                    </div>
                </div>
            </Carousel>
        </section>
    );
}

export default memo(HeroCarousel);
export { HeroCarousel };
