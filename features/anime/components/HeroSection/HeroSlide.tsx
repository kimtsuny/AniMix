import { memo } from "react";
import HeroBackground from "./HeroBackground";
import { AnimeHeroSlide } from "../../types/hero";

interface HeroSlideProps {
    slide: AnimeHeroSlide;
    priority?: boolean;
}

function HeroSlide({ slide, priority = false }: HeroSlideProps) {
    return (
        <article
            className="relative w-full min-h-[670px] lg:h-[88vh] overflow-hidden bg-black select-none"
            aria-label={`Slide for ${slide.title}`}
        >
            <HeroBackground
                imagePath={slide.imagePath}
                title={slide.title}
                priority={priority}
            />
        </article>
    );
}

export default memo(HeroSlide);
