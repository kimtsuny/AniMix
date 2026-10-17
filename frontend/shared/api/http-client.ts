const getBaseUrl = (): string => {
  // In development, preserve the environment variable (e.g., http://localhost:5000/api)
  if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  }

  // On the server, always resolve against BACKEND_URL or NEXT_PUBLIC_API_URL
  if (typeof window === "undefined") {
    const backend = (
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:5000"
    ).replace(/\/+$/, "");
    return backend.endsWith("/api") ? backend : `${backend}/api`;
  }

  // In production (Vercel), always route requests through the same-origin Next.js /api proxy
  // so cookies are treated as first-party by the browser.
  return "/api";
};

const API_URL = getBaseUrl();

export async function httpClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const response = await fetch(`${API_URL}${normalizedEndpoint}`, {
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