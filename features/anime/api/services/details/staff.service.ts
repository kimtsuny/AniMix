import { graphqlClient } from "@/shared/api/graphql-client";
import { STAFF_QUERY } from "../../queries/details/staff.query";
import { mapStaff } from "../../mappers/details/staff.mapper";
import { Staff } from "@/features/anime/types/staff";

export async function getAnimeStaff(id: string | number): Promise<Staff[]> {
  try {
    const data = await graphqlClient.request(STAFF_QUERY, { id: Number(id) });
    return mapStaff(data);
  } catch (error) {
    console.error("Failed to fetch anime staff:", error);
    return [];
  }
}
