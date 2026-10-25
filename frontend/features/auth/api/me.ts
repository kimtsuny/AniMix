import { httpClient, isUnauthorizedError } from "@/shared/api/http-client";
import type { User } from "../types/auth";

let inFlightMePromise: Promise<User | null> | null = null;

export interface MeOptions {
  force?: boolean;
}

async function fetchMe(): Promise<User | null> {
  try {
    return await httpClient<User>("/auth/me", {
      method: "GET",
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return null;
    }
    throw error;
  }
}

export async function me(options?: MeOptions): Promise<User | null> {
  if (inFlightMePromise && !options?.force) {
    return inFlightMePromise;
  }

  const promise = fetchMe();
  inFlightMePromise = promise;

  promise
    .finally(() => {
      if (inFlightMePromise === promise) {
        inFlightMePromise = null;
      }
    })
    .catch(() => {});

  return promise;
}