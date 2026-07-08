import Image from "next/image";
import Link from "next/link";
import { Relation } from "@/features/anime/types/relation";
import { Badge } from "../common/Badge";

interface RelatedSeriesCardProps {
  relation: Relation;
}

export function RelatedSeriesCard({ relation }: RelatedSeriesCardProps) {
  return (
    <Link href={`/anime/${relation.id}`} className="group block w-[160px] md:w-[200px] shrink-0">
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2 bg-muted">
        {relation.coverImage ? (
          <Image
            src={relation.coverImage}
            alt={relation.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No Image</div>
        )}
        <div className="absolute top-2 left-2">
          <Badge variant="outline" className="bg-black/60 text-white border-white/20 backdrop-blur-md">
            {relation.relationType.replace('_', ' ')}
          </Badge>
        </div>
      </div>
      <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
        {relation.title}
      </h3>
      <div className="flex items-center gap-2 mt-1">
        {relation.format && <span className="text-xs text-muted-foreground">{relation.format}</span>}
        {relation.status && (
          <span className="text-xs text-muted-foreground/70">• {relation.status.toLowerCase()}</span>
        )}
      </div>
    </Link>
  );
}
