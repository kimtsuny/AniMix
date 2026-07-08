import { Episode } from "@/features/anime/types/episode";

export function mapEpisodes(data: any): Episode[] {
  if (!data?.Media?.streamingEpisodes) return [];

  return data.Media.streamingEpisodes.map((ep: any) => ({
    title: ep.title || null,
    thumbnail: ep.thumbnail || null,
    url: ep.url || null,
    site: ep.site || null,
  }));
}
