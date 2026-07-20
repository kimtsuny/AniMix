import type { User } from "../types/auth";

/**
 * Mock user data for development.
 * Toggle between `null` (unauthenticated) and a user object (authenticated)
 * to test both states.
 *
 * This will be replaced with real API calls once the backend is connected.
 */
export const MOCK_USER: User | null = {
  id: 1,
  username: "Kimtsuny",
  avatar: "/animeHero/5.jpg",
};

// Set to `null` to test the unauthenticated state:
// export const MOCK_USER: User | null = null;
