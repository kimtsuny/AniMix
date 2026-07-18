import type { Metadata } from "next";
import Header from "@/shared/components/Header/Header";
import BottomNavigation from "@/shared/components/BottomNavigation";
import IntroLoader from "@/shared/components/IntroLoader/IntroLoader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anime Catalog",
  description: "Browse trending anime, manga, and manhwa in a cinematic catalog experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-black text-white">
        <IntroLoader />
        <Header />

        <main className="flex-1 pb-24  ">
          {children}
        </main>

        <BottomNavigation />
      </body>
    </html>
  );
}
