import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — AnimeHub",
  description:
    "Sign in to AnimeHub to discover thousands of anime, track your favorites, and build your ultimate watchlist.",
};

/**
 * Auth layout — no Header, BottomNavigation, or IntroLoader.
 * Full-screen auth experience.
 */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
