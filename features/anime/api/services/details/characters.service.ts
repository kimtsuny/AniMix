import { graphqlClient } from "@/shared/api/graphql-client";
import { CHARACTERS_QUERY } from "../../queries/details/characters.query";
import { mapCharacters } from "../../mappers/details/character.mapper";
import { Character } from "@/features/anime/types/character";

export async function getAnimeCharacters(id: string | number): Promise<Character[]> {
  try {
    const data = await graphqlClient.request(CHARACTERS_QUERY, { id: Number(id) });
    return mapCharacters(data);
  } catch (error) {
    console.error("Failed to fetch anime characters:", error);
    return [];
  }
}
