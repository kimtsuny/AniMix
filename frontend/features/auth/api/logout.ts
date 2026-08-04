import { httpClient } from "@/shared/api/http-client";

interface LogoutResponse {
  message: string;
}

export async function logout() {
  return httpClient<LogoutResponse>("/auth/logout", {
    method: "POST",
  });
}