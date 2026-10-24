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

export class HttpError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.data = data;
  }
}

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

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    // Response body is not JSON or is empty
  }

  if (!response.ok) {
    throw new HttpError(
      data?.message || response.statusText || "Something went wrong",
      response.status,
      data
    );
  }

  return data;
}