export interface AnimeHeroSlide {
    id: string;
    title: string;
    status: "Trending" | "Popular" | "New Season";
    rating: number;
    year: number;
    type: "TV" | "Movie" | "OVA" | "ONA";
    episodes: number;
    duration: string; // e.g. "24m" or "1h 45m"
    genres: string[];
    description: string;
    imagePath: string; // Path relative to public folder, e.g. "/anime/solo-leveling.webp"
}
