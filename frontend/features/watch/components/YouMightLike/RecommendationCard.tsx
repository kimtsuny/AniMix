import Image from "next/image";
import { Star } from "lucide-react";
import type { MockRecommendation } from "@/features/watch/data/mock-data";

interface RecommendationCardProps {
  anime: MockRecommendation;
}

export function RecommendationCard({ anime }: RecommendationCardProps) {
  return (
    <div className="group flex-shrink-0 w-[140px] md:w-[155px] lg:w-[165px] cursor-pointer">
      {/* Image container */}
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-2 ring-1 ring-white/10 group-hover:ring-white/25 transition-all">
        <Image
          src={anime.image}
          alt={anime.title}
          fill
          sizes="(max-width: 768px) 140px, 165px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Rating badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-md px-1.5 py-0.5">
          <Star className="size-3 fill-yellow-400 text-yellow-400" />
          <span className="text-white text-[11px] font-semibold">
            {anime.rating.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Info */}
      <h3 className="text-white/90 text-xs md:text-sm font-medium line-clamp-2 leading-tight mb-1 group-hover:text-white transition-colors">
        {anime.title}
      </h3>
      <p className="text-white/40 text-[11px]">
        {anime.year} · {anime.episodes} Episodes
      </p>
    </div>
  );
}
