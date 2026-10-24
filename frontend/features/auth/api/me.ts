import { httpClient, HttpError } from "@/shared/api/http-client";
import type { User } from "../types/auth";

let inFlightMePromise: Promise<User | null> | null = null;

export async function me(): Promise<User | null> {
  if (inFlightMePromise) {
    return inFlightMePromise;
  }

  inFlightMePromise = (async () => {
    try {
      return await httpClient<User>("/auth/me", {
        method: "GET",
      });
    } catch (error) {
      if (
        (error instanceof HttpError && error.status === 401) ||
        (error as any)?.status === 401 ||
        (error as any)?.message === "Unauthorized"
      ) {
        return null;
      }
      throw error;
    } finally {
      inFlightMePromise = null;
    }
  })();

  return inFlightMePromise;
}