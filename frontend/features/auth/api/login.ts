import { httpClient } from "@/shared/api/http-client";

interface LoginResponse {
  message: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
}

export async function login(email: string, password: string) {
  return httpClient<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
    }),
  });
}