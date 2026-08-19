import { httpClient } from "@/shared/api/http-client";

export async function register(
  username: string,
  email: string,
  password: string
) {
  return httpClient("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      username,
      email,
      password,
    }),
  });
}