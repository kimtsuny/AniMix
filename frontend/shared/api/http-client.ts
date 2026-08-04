const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export async function httpClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    credentials: "include",

    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },

    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}