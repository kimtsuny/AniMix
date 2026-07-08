import Image from "next/image";
import { memo } from "react";
import type { SectionAnime } from "../../../types/section-anime";
import Link from "next/link";

interface AnimeCardProps {
  anime: SectionAnime;
}

function AnimeCard({ anime }: AnimeCardProps) {
  return (
    <Link href={`/anime/${anime.id}`} className="group/card w-full cursor-pointer">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[18px] bg-white/5 shadow-md shadow-black/30 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-black/60">
        <Image
          src={anime.coverImage}
          alt={anime.title}
          fill
          loading="lazy"
          quality={75}
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 12.5vw"
          className="object-cover transition-transform duration-300 ease-out group-hover/card:scale-[1.04]"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
      </div>

      <div className="flex items-center justify-between gap-3 pt-3 px-1">
        <div className="flex-1 min-w-0">
          <h3 className="line-clamp-2 text-sm font-bold text-white leading-snug group-hover/card:text-[#e53946] transition-colors duration-300">
            {anime.title}
          </h3>
          <p className="mt-1 text-xs text-neutral-400 font-medium">
            {anime.season} {anime.seasonYear}
          </p>
        </div>
        {anime.format && (
          <div className="shrink-0">
            <span className="inline-block rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-300 uppercase tracking-wider">
              {anime.format}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default memo(AnimeCard);