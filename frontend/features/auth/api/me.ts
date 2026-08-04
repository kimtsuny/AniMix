import { httpClient } from "@/shared/api/http-client";
import type { User } from "../types/auth";

export async function me(): Promise<User> {
  return httpClient<User>("/auth/me", {
    method: "GET",
  });
}