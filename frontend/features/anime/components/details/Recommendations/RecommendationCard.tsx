import Image from "next/image";
import Link from "next/link";
import { Recommendation } from "@/features/anime/types/recommendation";

interface RecommendationCardProps {
  recommendation: Recommendation;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  return (
    <Link href={`/anime/${recommendation.id}`} className="group block w-[160px] md:w-[200px] shrink-0">
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2 bg-muted">
        {recommendation.coverImage ? (
          <Image
            src={recommendation.coverImage}
            alt={recommendation.title}
            fill
            sizes="(max-width: 768px) 160px, 200px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No Image</div>
        )}
      </div>
      <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
        {recommendation.title}
      </h3>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-muted-foreground">{recommendation.format || "Anime"}</span>
        <span className="text-xs font-semibold text-primary">{recommendation.rating > 0 ? `+${recommendation.rating}` : ''}</span>
      </div>
    </Link>
  );
}
