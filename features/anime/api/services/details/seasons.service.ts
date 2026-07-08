import { getAnimeRelations } from "./index";
import { Relation } from "@/features/anime/types/relation";
import { AnimeDetails } from "@/features/anime/types/anime-details";

export async function buildSeasonChain(initialId: number, initialDetails?: AnimeDetails): Promise<Relation[]> {
  const visited = new Set<number>();
  const seasonMap = new Map<number, Relation>();

  // Helper to process recursively
  async function traverse(id: number) {
    if (visited.has(id)) return;
    visited.add(id);

    const relations = await getAnimeRelations(id);
    
    // Find neighbors that are PREQUEL or SEQUEL
    const neighbors = relations.filter(r => 
      r.relationType === "PREQUEL" || r.relationType === "SEQUEL"
    );

    for (const relation of neighbors) {
      if (!seasonMap.has(relation.id) && (relation.format === "TV" || relation.format === "TV_SHORT" || relation.format === "ONA")) {
        seasonMap.set(relation.id, relation);
      }
    }
    
    for (const relation of neighbors) {
      if (!visited.has(relation.id)) {
        await traverse(relation.id);
      }
    }
  }

  await traverse(initialId);

  // If the initialId was not added (e.g. because it had no prequel/sequel or it's the only season),
  // we must add it manually.
  if (!seasonMap.has(initialId)) {
    if (initialDetails && (initialDetails.format === "TV" || initialDetails.format === "TV_SHORT" || initialDetails.format === "ONA")) {
       seasonMap.set(initialId, {
          id: initialDetails.id,
          title: initialDetails.title.english || initialDetails.title.romaji || "Unknown Title",
          coverImage: initialDetails.coverImage.large || null,
          relationType: "CURRENT",
          format: initialDetails.format,
          status: initialDetails.status,
          startDate: null // We don't have startDate, but it's the only season so sorting doesn't matter
       });
    }
  }

  // Convert map to array and sort by startDate
  const seasonsList = Array.from(seasonMap.values());
  
  seasonsList.sort((a, b) => {
    const dateA = a.startDate ? (a.startDate.year || 0) * 10000 + (a.startDate.month || 0) * 100 + (a.startDate.day || 0) : 0;
    const dateB = b.startDate ? (b.startDate.year || 0) * 10000 + (b.startDate.month || 0) * 100 + (b.startDate.day || 0) : 0;
    
    if (dateA === 0 && dateB === 0) return a.id - b.id;
    if (dateA === 0) return 1; 
    if (dateB === 0) return -1;
    
    return dateA - dateB;
  });

  return seasonsList;
}
