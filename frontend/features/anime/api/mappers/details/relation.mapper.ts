import { Relation } from "@/features/anime/types/relation";

export function mapRelations(data: any): Relation[] {
  if (!data?.Media?.relations?.edges) return [];

  return data.Media.relations.edges
    .filter((edge: any) => edge.node)
    .map((edge: any) => ({
      id: edge.node.id,
      title: edge.node.title?.english || edge.node.title?.romaji || "Unknown Title",
      coverImage: edge.node.coverImage?.large || null,
      relationType: edge.relationType || "RELATED",
      format: edge.node.format || null,
      status: edge.node.status || null,
      startDate: edge.node.startDate || null,
    }));
}
