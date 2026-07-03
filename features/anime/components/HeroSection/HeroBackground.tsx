import { memo } from "react";
import Image from "next/image";

interface HeroBackgroundProps {
    imagePath: string;
    title: string;
    priority?: boolean;
}

function HeroBackground({ imagePath, title, priority = false }: HeroBackgroundProps) {
    return (
        <div className="absolute inset-0 select-none pointer-events-none overflow-hidden">
            <Image
                src={imagePath}
                alt={title}
                fill
                priority={priority}
                loading={priority ? "eager" : "lazy"}
                sizes="100vw"
                className="object-cover object-center"
            />
            
            {/* Soft left-to-right gradient behind the text for readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 via-30% to-transparent z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 via-50% to-transparent z-10 md:hidden" />
            
            {/* Subtle top gradient to improve header readability */}
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/65 via-black/10 to-transparent z-10" />
            
            {/* Strong bottom gradient that smoothly blends into the page background */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 via-20% to-transparent z-10" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent z-10" />
        </div>
    );
}

export default memo(HeroBackground);
