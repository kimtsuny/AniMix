import { memo } from "react";
import GenreBadge from "./GenreBadge";
import MetadataRow from "./MetadataRow";
import StatusBadge from "./StatusBadge";
import { AnimeHeroSlide } from "../../types/hero";

interface HeroContentProps {
    slide: AnimeHeroSlide;
    isActive?: boolean;
}

function HeroContent({
    slide,
    isActive = false,
}: HeroContentProps) {
    return (
        <div
            className={`relative z-20 flex w-full max-w-[42rem] flex-col items-start gap-4 sm:gap-5 md:gap-6 transition-all duration-700 ease-out ${
                isActive
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
            }`}
        >
            {/* Trending Badge */}
            <div className=" left-0">
                <StatusBadge status={slide.status} />
            </div>

            <h1 className="text-balance text-3xl font-extrabold tracking-tight text-white leading-tight sm:text-4xl md:text-5xl lg:text-6xl drop-shadow-lg">
                {slide.title}
            </h1>

            <MetadataRow
                rating={slide.rating}
                year={slide.year}
                type={slide.type}
                episodes={slide.episodes}
                duration={slide.duration}
            />

            <div className="flex flex-wrap gap-2">
                {slide.genres.map((genre) => (
                    <GenreBadge key={genre} genre={genre} />
                ))}
            </div>

            <p className="max-w-[38rem] text-sm leading-relaxed text-zinc-300 md:text-base line-clamp-3 drop-shadow-md">
                {slide.description}
            </p>
        </div>
    );
}

export default memo(HeroContent);