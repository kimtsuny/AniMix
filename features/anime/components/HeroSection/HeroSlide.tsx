import { memo } from "react";
import HeroBackground from "./HeroBackground";
import type { HeroAnime } from "../../types/hero";

interface HeroSlideProps {
    slide: HeroAnime;
    priority?: boolean;
}

function HeroSlide({ slide, priority = false }: HeroSlideProps) {
    return (
        <article
            className="relative w-full min-h-[670px] lg:h-[88vh] overflow-hidden bg-black select-none"
            aria-label={`Slide for ${slide.title}`}
        >
            <HeroBackground
                imagePath={slide.bannerImage ?? slide.coverImage}
                title={slide.title}
                priority={priority}
            />
        </article>
    );
}

export default memo(HeroSlide);