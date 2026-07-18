import { Relation } from "@/features/anime/types/relation";
import { AnimeDetails } from "@/features/anime/types/anime-details";

export function mapSeasons(data: any, details?: AnimeDetails | null): Relation[] {
  if (!data?.Media?.relations?.edges) return [];

  const seasonMap = new Map<number, Relation>();
  const visitedNodes = new Set<number>();

  function traverse(edges: any[]) {
    if (!edges) return;

    const neighbors = edges.filter((edge: any) => 
      edge.relationType === "PREQUEL" || edge.relationType === "SEQUEL"
    );

    for (const edge of neighbors) {
      const node = edge.node;
      if (!node) continue;
      
      const id = node.id;
      visitedNodes.add(id);

      if (!seasonMap.has(id) && (node.format === "TV" || node.format === "TV_SHORT" || node.format === "ONA")) {
        seasonMap.set(id, {
          id: node.id,
          title: node.title?.english || node.title?.romaji || "Unknown Title",
          coverImage: node.coverImage?.large || null,
          relationType: edge.relationType,
          format: node.format,
          status: node.status,
          startDate: node.startDate || null,
        });
      }
    }

    for (const edge of neighbors) {
      const node = edge.node;
      if (node?.relations?.edges) {
        traverse(node.relations.edges);
      }
    }
  }

  traverse(data.Media.relations.edges);

  const initialId = data.Media.id;
  if (!seasonMap.has(initialId) && details) {
    if (details.format === "TV" || details.format === "TV_SHORT" || details.format === "ONA") {
       seasonMap.set(initialId, {
          id: details.id,
          title: details.title.english || details.title.romaji || "Unknown Title",
          coverImage: details.coverImage.large || null,
          relationType: "CURRENT",
          format: details.format,
          status: details.status,
          startDate: null
       });
    }
  }

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
