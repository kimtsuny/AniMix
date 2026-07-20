import { graphqlClient } from "@/shared/api/graphql-client";
import { SEARCH_ANIME_QUERY } from "../queries/search.query";
import { mapSearchAnime } from "../mappers/search.mapper";
import type { SearchMediaResponse } from "../../types/search.types";
import type { SearchAnime } from "../../types/search.types";

export async function searchAnime(
  query: string,
  signal?: AbortSignal
): Promise<SearchAnime[]> {
  const response = await graphqlClient.request<SearchMediaResponse>({
    document: SEARCH_ANIME_QUERY,
    variables: { search: query },
    signal,
  });

  return response.Page.media.map(mapSearchAnime);
}
