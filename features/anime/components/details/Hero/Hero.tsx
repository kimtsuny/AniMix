import Image from "next/image";
import { AnimeDetails } from "@/features/anime/types/anime-details";
import { Button } from "@/shared/components/ui/button";
import { Play, Plus, Share2, Star, Trophy, Users, Heart, Clock, Film, Tv, Globe, BookOpen } from "lucide-react";
import { Badge } from "../common/Badge";
import { InfoChip } from "../common/InfoChip";
import { StatItem } from "../common/StatItem";

interface HeroProps {
  anime: AnimeDetails | null;
}

export function Hero({ anime }: HeroProps) {
  if (!anime) return null;

  const title = anime.title.english || anime.title.romaji || "Unknown Title";
  const nativeTitle = anime.title.native;
  const bannerImage = anime.bannerImage || anime.coverImage.extraLarge || anime.coverImage.large;
  const posterImage = anime.coverImage.extraLarge || anime.coverImage.large;

  return (
    <div className="relative w-full overflow-hidden bg-black">
      {/* Banner Background */}
      <div className="absolute inset-0 h-[60vh] md:h-[80vh] w-full">
        {bannerImage && (
          <Image
            src={bannerImage}
            alt={`${title} banner`}
            fill
            priority
className="object-cover object-center opacity-55 mask-image-gradient"
            style={{ maskImage: 'linear-gradient(to bottom, black 20%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 100%)' }}
          />
        )}
<div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />      </div>

      <div className="relative z-10  w-full max-w-[1700px] px-6 md:px-20 xl:px-24 pt-24 pb-12 md:pt-40 md:pb-16 flex flex-col md:flex-row gap-10 md:gap-16 items-start">        <div className="w-[200px] md:w-[280px] shrink-0 mx-auto md:mx-0 group relative rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
        <div className="aspect-[2/3] relative">
          {posterImage ? (
            <Image
              src={posterImage}
              alt={`${title} poster`}
              fill
              priority
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">No Image</div>
          )}

          {/* Trailer Overlay */}
          {anime.trailer && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
              <Button size="icon-lg" variant="secondary" className="rounded-full h-16 w-16 bg-white/20 hover:bg-white/40 text-white backdrop-blur-md border border-white/30 transition-transform hover:scale-110">
                <Play className="h-6 w-6 ml-1" />
              </Button>
              <span className="absolute bottom-6 font-medium text-white tracking-widest text-sm uppercase">Trailer</span>
            </div>
          )}
        </div>
      </div>

        {/* Info Container */}
        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-6 w-full mt-4 md:mt-8">

          <div className="space-y-2 w-full">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground drop-shadow-sm">
              {title}
            </h1>
            {nativeTitle && (
              <p className="text-xl md:text-2xl text-muted-foreground/80 font-medium">
                {nativeTitle}
              </p>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-muted-foreground">
            {anime.averageScore && (
              <InfoChip icon={<Star className="h-4 w-4 text-yellow-500" fill="currentColor" />} label={`${(anime.averageScore / 10).toFixed(1)}`} className="text-yellow-500 font-bold" />
            )}
            {anime.rank && (
              <InfoChip icon={<Trophy className="h-4 w-4" />} label={`Rank #${anime.rank}`} />
            )}
            {anime.popularity && (
              <InfoChip icon={<Users className="h-4 w-4" />} label={`${(anime.popularity / 1000).toFixed(1)}K`} />
            )}
            {anime.favorites && (
              <InfoChip icon={<Heart className="h-4 w-4 text-red-500" />} label={`${(anime.favorites / 1000).toFixed(1)}K`} />
            )}
          </div>

          {/* Format / Status row */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            {anime.format && <Badge variant="outline">{anime.format}</Badge>}
            {anime.status && <Badge variant={anime.status === 'FINISHED' ? 'success' : 'default'}>{anime.status}</Badge>}
            {anime.episodes && <span className="text-sm text-muted-foreground">{anime.episodes} Episodes</span>}
            {anime.duration && <span className="text-sm text-muted-foreground">{anime.duration} min</span>}
          </div>

          {/* Detailed Stats Row */}
          <div className="hidden md:flex flex-wrap items-center gap-6 py-4 border-y border-border/40 w-full">
            {anime.season && anime.seasonYear && <StatItem icon={<Tv className="h-3 w-3" />} label="Season" value={`${anime.season} ${anime.seasonYear}`} />}
            {anime.studios && anime.studios.length > 0 && <StatItem icon={<Film className="h-3 w-3" />} label="Studio" value={anime.studios[0]} />}
            {anime.source && <StatItem icon={<BookOpen className="h-3 w-3" />} label="Source" value={anime.source} />}
            {anime.countryOfOrigin && <StatItem icon={<Globe className="h-3 w-3" />} label="Country" value={anime.countryOfOrigin} />}
          </div>

          {/* Genres */}
          {anime.genres && anime.genres.length > 0 && (
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              {anime.genres.map((genre) => (
                <Badge key={genre} variant="outline" className="bg-background/50 hover:bg-background/80 transition-colors cursor-default">
                  {genre}
                </Badge>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4 w-full">
            <Button size="lg" className="w-full md:w-auto h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-xl font-semibold text-base transition-all active:scale-95">
              <Play className="mr-2 h-5 w-5 fill-current" /> Watch Now
            </Button>
            <Button size="lg" variant="secondary" className="w-full md:w-auto h-12 px-6 rounded-xl font-medium border border-border/50 bg-secondary/80 hover:bg-secondary backdrop-blur-sm transition-all">
              <Plus className="mr-2 h-5 w-5" /> Add to List
            </Button>
            <Button size="icon-lg" variant="ghost" className="h-12 w-12 rounded-xl border border-border/30 hover:bg-muted/50 hidden md:inline-flex">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
