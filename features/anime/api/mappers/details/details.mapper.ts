import { AnimeDetails } from "@/features/anime/types/anime-details";

export function mapAnimeDetails(data: any): AnimeDetails | null {
  if (!data?.Media) return null;
  const media = data.Media;

  return {
    id: media.id,
    title: {
      english: media.title?.english || null,
      romaji: media.title?.romaji || null,
      native: media.title?.native || null,
    },
    description: media.description || null,
    coverImage: {
      extraLarge: media.coverImage?.extraLarge || null,
      large: media.coverImage?.large || null,
      color: media.coverImage?.color || null,
    },
    bannerImage: media.bannerImage || null,
    averageScore: media.averageScore || null,
    rank: media.rankings?.find((r: any) => r.type === "RATED" && r.allTime)?.rank || media.rankings?.[0]?.rank || null,
    popularity: media.popularity || null,
    favorites: media.favourites || null,
    format: media.format || null,
    status: media.status || null,
    episodes: media.episodes || null,
    duration: media.duration || null,
    season: media.season || null,
    seasonYear: media.seasonYear || null,
    genres: media.genres || [],
    source: media.source || null,
    countryOfOrigin: media.countryOfOrigin || null,
    studios: media.studios?.nodes?.map((n: any) => n.name) || [],
    trailer: media.trailer ? {
      id: media.trailer.id,
      site: media.trailer.site,
      thumbnail: media.trailer.thumbnail,
    } : null,
  };
}
