import { Staff } from "@/features/anime/types/staff";

export function mapStaff(data: any): Staff[] {
  if (!data?.Media?.staff?.edges) return [];

  return data.Media.staff.edges.map((edge: any) => ({
    id: edge.node.id,
    role: edge.role,
    name: edge.node.name?.full || "Unknown",
    image: edge.node.image?.large || null,
    primaryOccupations: edge.node.primaryOccupations || [],
  }));
}