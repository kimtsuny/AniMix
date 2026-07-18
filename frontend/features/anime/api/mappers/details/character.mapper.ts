import { Character } from "@/features/anime/types/character";

export function mapCharacters(data: any): Character[] {
  if (!data?.Media?.characters?.edges) return [];

  return data.Media.characters.edges.map((edge: any) => ({
    id: edge.node.id,
    name: edge.node.name?.full || "Unknown",
    image: edge.node.image?.large || null,
    role: edge.role || null,
  }));
}
