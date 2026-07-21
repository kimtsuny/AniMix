import Header from "@/shared/components/Header/Header";
import BottomNavigation from "@/shared/components/BottomNavigation";
import { SearchProvider, SearchOverlay } from "@/features/search";
import ScrollToTop from "@/shared/components/ScrollToTop";

/**
 * Main app layout — includes Header, BottomNavigation, and IntroLoader.
 * Wraps all non-auth pages (home, anime, manga, manhwa, etc.).
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SearchProvider>
      <ScrollToTop />

      <Header />

      <main className="flex-1 pb-24">
        {children}
      </main>

      <BottomNavigation />
      <SearchOverlay />
    </SearchProvider>
  );
}