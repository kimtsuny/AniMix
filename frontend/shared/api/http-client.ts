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
  retryAfter?: number;

  constructor(
    message: string,
    status: number,
    data?: unknown,
    retryAfter?: number
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.data = data;
    this.retryAfter = retryAfter;
  }
}

export function isUnauthorizedError(error: unknown): boolean {
  if (error instanceof HttpError && error.status === 401) {
    return true;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: unknown }).status === 401
  ) {
    return true;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    const msg = (error as { message: unknown }).message;
    if (msg === "Unauthorized" || msg === "Invalid token") {
      return true;
    }
  }
  return false;
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

  let data: (Record<string, unknown> & { message?: string }) | null = null;
  try {
    data = await response.json();
  } catch {
    // Response body is not JSON or is empty
  }

  if (!response.ok) {
    let retryAfter: number | undefined;
    const retryHeader = response.headers.get("Retry-After");
    if (retryHeader) {
      const parsedSeconds = parseInt(retryHeader, 10);
      if (!Number.isNaN(parsedSeconds) && parsedSeconds > 0) {
        retryAfter = parsedSeconds;
      } else {
        const parsedDate = Date.parse(retryHeader);
        if (!Number.isNaN(parsedDate)) {
          retryAfter = Math.max(0, Math.ceil((parsedDate - Date.now()) / 1000));
        }
      }
    }

    let fallbackMessage = response.statusText || "Something went wrong";
    if (response.status === 429) {
      fallbackMessage = "Too many requests. Please wait a moment and try again.";
    } else if (response.status === 503) {
      fallbackMessage = "Service temporarily unavailable. Please try again shortly.";
    }

    throw new HttpError(
      data?.message || fallbackMessage,
      response.status,
      data,
      retryAfter
    );
  }

  return data as T;
}