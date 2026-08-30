"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { AnimeDetails } from "@/features/anime/types/anime-details";
import { Button } from "@/shared/components/ui/button";
import { Play, Share2, Star, Trophy, Users, Heart, Clock, Film, Tv, Globe, BookOpen } from "lucide-react";
import { Badge } from "../common/Badge";
import { InfoChip } from "../common/InfoChip";
import { StatItem } from "../common/StatItem";
import { addFavorite } from "@/features/favorites/api/add-favorite";
import { removeFavorite } from "@/features/favorites/api/remove-favorite";
import { getFavorites } from "@/features/favorites/api/get-favorites";
interface HeroProps {
  anime: AnimeDetails | null;
}

export function Hero({ anime }: HeroProps) {
 const [isFavorite, setIsFavorite] = useState(false);
const [isAddingFavorite, setIsAddingFavorite] = useState(false);
async function handleFavorite() {
  if (!anime) return;

  try {
    setIsAddingFavorite(true);

    if (isFavorite) {
      await removeFavorite(anime.id);

      setIsFavorite(false);
    } else {
      await addFavorite(anime.id);

      setIsFavorite(true);
    }
  } catch (error) {
    console.error("Failed to update favorite:", error);
  } finally {
    setIsAddingFavorite(false);
  }
}

  if (!anime) return null;
useEffect(() => {
  if (!anime) return;

  const animeId = anime.id;

  async function checkFavorite() {
    try {
      const data = await getFavorites();

      const exists = data.favorites.some(
        (favorite) => favorite.animeId === animeId
      );

      setIsFavorite(exists);
    } catch (error) {
      console.error("Failed to check favorite:", error);
    }
  }

  checkFavorite();
}, [anime]);

  const title = anime.title.english || anime.title.romaji || "Unknown Title";
  const nativeTitle = anime.title.native;
  const bannerImage = anime.bannerImage || anime.coverImage.extraLarge || anime.coverImage.large;
  const posterImage = anime.coverImage.extraLarge || anime.coverImage.large;

  return (
    <div className="relative w-full overflow-hidden bg-black" style={{ minHeight: '90vh' }}>
      {/* ─── Desktop Banner Background (md+) ─── */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        {/* Banner — shifted downward so the center of the artwork is visible, not the top */}
        <div className="absolute inset-0">
          {bannerImage && (
            <Image
              src={bannerImage}
              alt={`${title} banner`}
              fill
              priority
              sizes="100vw"
              className="object-cover"
              style={{ objectPosition: 'center 22%' }}
            />
          )}
        </div>

        {/* Radial vignette — soft shadow around all four edges for cinematic immersion */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 85% 75% at 50% 45%, transparent 40%, rgba(0,0,0,0.25) 65%, rgba(0,0,0,0.6) 85%, rgba(0,0,0,0.85) 100%)'
          }}
        />

        {/* Top fade — subtle dark blend so navigation dissolves naturally */}
        <div
          className="absolute inset-x-0 top-0 h-56"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 25%, rgba(0,0,0,0.12) 55%, transparent 100%)'
          }}
        />

        {/* Left fade — strong gradient for text readability */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.5) 20%, rgba(0,0,0,0.18) 42%, transparent 62%)'
          }}
        />

        {/* Right fade — medium gradient to frame the artwork */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to left, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.25) 15%, rgba(0,0,0,0.08) 35%, transparent 55%)'
          }}
        />

        {/* Bottom fade — strong cinematic dissolve into page background */}
        <div
          className="absolute inset-x-0 bottom-0 h-full"
          style={{
            background: 'linear-gradient(to top, black 0%, black 5%, rgba(0,0,0,0.95) 12%, rgba(0,0,0,0.82) 25%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0.1) 70%, transparent 90%)'
          }}
        />
      </div>

      {/* ─── Mobile Banner Background (<md) ─── */}
      <div className="md:hidden absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-[50vh]">
          {bannerImage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Image
                src={bannerImage}
                alt={`${title} banner`}
                fill
                priority
                sizes="100vw"
                className="object-cover object-[center_35%] scale-110"
              />
            </div>
          )}
        </div>

        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/90 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-black/20" />

        <div
          className="absolute inset-x-0 top-0 h-[65vh]"
          style={{
            background: 'linear-gradient(to top, black 0%, black 20%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.1) 80%, transparent 100%)',
          }}
        />
      </div>

      {/* Content — positioned inside the cinematic scene with breathing room */}
      <div className="relative z-10 w-full max-w-[1700px] mx-auto px-6 md:px-12 xl:px-20 pt-24 pb-12 md:pt-[16vh] lg:pt-[20vh] md:pb-36 flex flex-col md:flex-row gap-8 lg:gap-12 items-center md:items-start">
        {/* Poster Card */}
        <div className="w-[180px] md:w-[280px] lg:w-[320px] shrink-0 mx-auto md:mx-0 group relative rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl shadow-black/80">
          <div className="aspect-[2/3] relative">
            {posterImage ? (
              <Image
                src={posterImage}
                alt={`${title} poster`}
                fill
                sizes="(max-width: 768px) 180px, (max-width: 1024px) 280px, 320px"
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

        {/* Info Container — Margined down to visually center with the poster */}
        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-5 w-full mt-4 md:mt- lg:mt-">

          <div className="space-y-2 w-full">
            <h1
              className="text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-foreground"
              style={{ textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}
            >
              {title}
            </h1>
            {nativeTitle && (
              <p
                className="text-lg md:text-2xl text-muted-foreground/80 font-medium"
                style={{ textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}
              >
                {nativeTitle}
              </p>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-muted-foreground">
            {anime.averageScore && (
              <InfoChip icon={<Star className="h-4 w-4 text-yellow-500" fill="currentColor" />} label={`${(anime.averageScore / 10).toFixed(1)}`} className="text-yellow-500 font-bold" />
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
            {anime.format && <Badge variant="outline" className="border-white/20 bg-black/40 backdrop-blur-sm">{anime.format}</Badge>}
            {anime.status && <Badge variant={anime.status === 'FINISHED' ? 'success' : 'default'} className="backdrop-blur-sm">{anime.status}</Badge>}
            {anime.episodes && <span className="text-sm font-medium text-white/80">{anime.episodes} Episodes</span>}
            {anime.duration && <span className="text-sm font-medium text-white/80">{anime.duration} min</span>}
          </div>

          {/* Detailed Stats Row */}
          <div className="hidden md:flex flex-wrap items-center gap-6 py-4 border-y border-white/10 w-full mt-2">
            {anime.season && anime.seasonYear && <StatItem icon={<Tv className="h-3 w-3 text-muted-foreground" />} label="Season" value={`${anime.season} ${anime.seasonYear}`} />}
            {anime.studios && anime.studios.length > 0 && <StatItem icon={<Film className="h-3 w-3 text-muted-foreground" />} label="Studio" value={anime.studios[0]} />}
            {anime.source && <StatItem icon={<BookOpen className="h-3 w-3 text-muted-foreground" />} label="Source" value={anime.source} />}
            {anime.countryOfOrigin && <StatItem icon={<Globe className="h-3 w-3 text-muted-foreground" />} label="Country" value={anime.countryOfOrigin} />}
          </div>

          {/* Genres */}
          {anime.genres && anime.genres.length > 0 && (
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
              {anime.genres.map((genre) => (
                <Badge key={genre} variant="outline" className="bg-white/5 hover:bg-white/10 border-white/10 backdrop-blur-sm transition-colors cursor-default">
                  {genre}
                </Badge>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4 w-full">
            <Button size="lg" className="w-full md:w-auto h-12 px-8 bg-white text-black hover:bg-white/90 shadow-xl shadow-black/20 rounded-xl font-bold text-base transition-all active:scale-95">
              <Play className="mr-2 h-5 w-5 fill-current" /> Watch Now
            </Button>
            <Button
              size="lg"
              variant="secondary"
onClick={handleFavorite}
              disabled={isAddingFavorite}
              className={`w-full md:w-auto h-12 px-6 rounded-xl font-medium border backdrop-blur-md transition-all duration-300 ease-in-out active:scale-95 ${
                isFavorite
                  ? "border-red-500/40 bg-red-500/20 hover:bg-red-500/30 text-red-400"
                  : "border-white/10 bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              <Heart
                className={`mr-2 h-5 w-5 transition-all duration-300 ease-in-out ${isFavorite ? "scale-110 text-red-500" : "scale-100"}`}
                fill={isFavorite ? "currentColor" : "none"}
              />
              {isFavorite ? "Favorited" : "Add to Favorites"}
            </Button>
            <Button size="icon-lg" variant="ghost" className="h-12 w-12 rounded-xl border border-white/10 hover:bg-white/10 bg-white/5 text-white backdrop-blur-md hidden md:inline-flex">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
