import type { SocialProvider } from "../types/auth";

/**
 * Social login API call.
 * Will be implemented when the backend OAuth endpoints are ready.
 */
export async function socialLogin(provider: SocialProvider) {
  // TODO: Redirect to OAuth provider or call backend endpoint
  console.log("Social login called with provider:", provider);
  return null;
}
