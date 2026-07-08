import { graphqlClient } from "@/shared/api/graphql-client";
import { RELATIONS_QUERY } from "../../queries/details/relations.query";
import { mapRelations } from "../../mappers/details/relation.mapper";
import { Relation } from "@/features/anime/types/relation";

export async function getAnimeRelations(id: string | number): Promise<Relation[]> {
  try {
    const data = await graphqlClient.request(RELATIONS_QUERY, { id: Number(id) });
    return mapRelations(data);
  } catch (error) {
    console.error("Failed to fetch anime relations:", error);
    return [];
  }
}
