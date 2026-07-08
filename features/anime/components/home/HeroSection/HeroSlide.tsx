import { memo } from "react";
import HeroBackground from "./HeroBackground";
import type { HeroAnime } from "../../../types/hero";

interface HeroSlideProps {
    slide: HeroAnime;
    priority?: boolean;
}

const heroImages: Record<number, string> = {
    16498: "/images/hero/aot.jpg",
    101922: "/images/hero/demonSlayer.jpg",
    113415: "/images/hero/jjk.jpg",
    1535: "/images/hero/death1.webp",
    21459: "/images/hero/myhero.webp",
};

function HeroSlide({ slide, priority = false }: HeroSlideProps) {
    const heroImage =
        heroImages[slide.id] ??
        slide.bannerImage ??
        slide.coverImage;

    return (
        <article
            className="relative w-full min-h-[670px] lg:h-[88vh] overflow-hidden bg-black select-none"
            aria-label={`Slide for ${slide.title}`}
        >
            <HeroBackground
                imagePath={heroImage}
                title={slide.title}
                priority={priority}
            />
        </article>
    );
}

export default memo(HeroSlide);