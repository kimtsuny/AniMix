import { filterAllowedAnime, isAnimeAllowed } from "@/shared/lib/content-filter";
import { mapSectionAnime, RawSectionMedia } from "../home/map-section-anime";
import { mapSearchAnime } from "@/features/search/api/mappers/search.mapper";
import { mapRecommendations } from "@/features/anime/api/mappers/details/recommendation.mapper";
import { mapRelations } from "@/features/anime/api/mappers/details/relation.mapper";
import { mapSeasons } from "@/features/anime/api/mappers/details/seasons.mapper";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ ${testName}${detail ? ` - ${detail}` : ""}`);
    failed++;
  }
}

console.log("--- Testing Catalog Pipeline and Filtering Across All Discovery Paths ---\n");

// 1. Hero Carousel Catalog Path
{
  const rawHeroMedia = [
    { id: 1, title: { english: "Hero 1" }, genres: ["Action", "Ecchi"], isAdult: false }, // Excluded (Ecchi)
    { id: 2, title: { english: "Hero 2" }, genres: ["Harem", "Comedy"], isAdult: false }, // Excluded (Harem)
    { id: 3, title: { english: "Hero 3" }, genres: ["Action"], isAdult: true }, // Excluded (Adult)
    { id: 4, title: { english: "Hero 4" }, genres: null, isAdult: false }, // Excluded (Missing genres)
    { id: 5, title: { english: "Hero 5" }, genres: ["Action", "Adventure"], isAdult: false }, // Safe 1
    { id: 6, title: { english: "Hero 6" }, genres: ["Fantasy", "Sci-Fi"], isAdult: false }, // Safe 2
    { id: 7, title: { english: "Hero 7" }, genres: ["Mystery", "Thriller"], isAdult: false }, // Safe 3
    { id: 8, title: { english: "Hero 8" }, genres: ["Drama", "Supernatural"], isAdult: false }, // Safe 4
    { id: 9, title: { english: "Hero 9" }, genres: ["Comedy", "Slice of Life"], isAdult: false }, // Safe 5
    { id: 10, title: { english: "Hero 10" }, genres: ["Action", "Adventure"], isAdult: false }, // Safe 6 (extra candidate)
  ];

  const allowedHero = filterAllowedAnime(rawHeroMedia).slice(0, 5);
  assert(allowedHero.length === 5, "Hero pipeline preserves exactly 5 safe candidates");
  assert(!allowedHero.some(h => h.id === 1 || h.id === 2 || h.id === 3 || h.id === 4), "Hero carousel strictly excludes Ecchi, Harem, Adult, and unverified entries");
  assert(allowedHero.map(h => h.id).join(",") === "5,6,7,8,9", "Hero carousel selects top 5 safe candidates in order");
}

// 2. Section Media Paths (Trending, Popular, Top Rated, Season, Upcoming)
{
  const rawSectionItems: RawSectionMedia[] = [
    { id: 10, title: { english: "Dan Da Dan", romaji: "Dan Da Dan" }, coverImage: { extraLarge: "x" }, averageScore: 85, format: "TV", episodes: 12, season: "FALL", seasonYear: 2024, status: "FINISHED", genres: ["Action", "Comedy", "Supernatural"], isAdult: false },
    { id: 11, title: { english: "Ecchi Series", romaji: "Ecchi" }, coverImage: { extraLarge: "x" }, averageScore: 70, format: "TV", episodes: 12, season: "FALL", seasonYear: 2024, status: "FINISHED", genres: ["Comedy", "Ecchi"], isAdult: false },
    { id: 12, title: { english: "Harem Club", romaji: "Harem" }, coverImage: { extraLarge: "x" }, averageScore: 68, format: "TV", episodes: 12, season: "FALL", seasonYear: 2024, status: "FINISHED", genres: ["Romance", "Harem"], isAdult: false },
    { id: 13, title: { english: "Adult Content", romaji: "Adult" }, coverImage: { extraLarge: "x" }, averageScore: 90, format: "TV", episodes: 12, season: "FALL", seasonYear: 2024, status: "FINISHED", genres: ["Drama"], isAdult: true },
    { id: 14, title: { english: "No Metadata", romaji: "None" }, coverImage: { extraLarge: "x" }, averageScore: 80, format: "TV", episodes: 12, season: "FALL", seasonYear: 2024, status: "FINISHED", genres: [], isAdult: false },
    { id: 15, title: { english: "Frieren", romaji: "Frieren" }, coverImage: { extraLarge: "x" }, averageScore: 95, format: "TV", episodes: 28, season: "FALL", seasonYear: 2023, status: "FINISHED", genres: ["Adventure", "Drama", "Fantasy"], isAdult: false },
  ];

  const filteredSections = filterAllowedAnime(rawSectionItems).map(mapSectionAnime);
  assert(filteredSections.length === 2, "Section filtering retains only safe, verified anime");
  assert(filteredSections[0].id === 10, "First safe section item retained");
  assert(filteredSections[1].id === 15, "Second safe section item retained");
}

// 3. Search Pipeline Filtering
{
  const rawSearchMedia = [
    { id: 101, title: { english: "Normal Search Hit", romaji: "Normal", native: "Normal" }, coverImage: { large: "l" }, bannerImage: null, episodes: 12, format: "TV", status: "RELEASING", averageScore: 80, season: "SUMMER", seasonYear: 2024, genres: ["Action", "Sci-Fi"], isAdult: false, description: "A normal show." },
    { id: 102, title: { english: "Ecchi Show", romaji: "Ecchi", native: "Ecchi" }, coverImage: { large: "l" }, bannerImage: null, episodes: 12, format: "TV", status: "RELEASING", averageScore: 75, season: "SUMMER", seasonYear: 2024, genres: ["Ecchi"], isAdult: false, description: "An ecchi show." },
    { id: 103, title: { english: "Harem Show", romaji: "Harem", native: "Harem" }, coverImage: { large: "l" }, bannerImage: null, episodes: 12, format: "TV", status: "RELEASING", averageScore: 72, season: "SUMMER", seasonYear: 2024, genres: ["Harem"], isAdult: false, description: "A harem show." },
    { id: 104, title: { english: "Adult Show", romaji: "Adult", native: "Adult" }, coverImage: { large: "l" }, bannerImage: null, episodes: 12, format: "TV", status: "RELEASING", averageScore: 88, season: "SUMMER", seasonYear: 2024, genres: ["Action"], isAdult: true, description: "Adult show." },
  ];

  const searchResults = filterAllowedAnime(rawSearchMedia).slice(0, 10).map(mapSearchAnime);
  assert(searchResults.length === 1, "Search returns only the safe search hit");
  assert(searchResults[0].id === 101, "Search result mapped correctly");
  assert(searchResults[0].title === "Normal Search Hit", "Search title mapped correctly");
}

// 4. Details Page Recommendations Mapping
{
  const detailsData = {
    Media: {
      id: 200,
      isAdult: false,
      genres: ["Action"],
      recommendations: {
        nodes: [
          {
            rating: 100,
            mediaRecommendation: { id: 201, title: { english: "Safe Rec" }, coverImage: { large: "l" }, episodes: 12, format: "TV", genres: ["Action", "Adventure"], isAdult: false },
          },
          {
            rating: 90,
            mediaRecommendation: { id: 202, title: { english: "Ecchi Rec" }, coverImage: { large: "l" }, episodes: 12, format: "TV", genres: ["Comedy", "Ecchi"], isAdult: false },
          },
          {
            rating: 80,
            mediaRecommendation: { id: 203, title: { english: "Harem Rec" }, coverImage: { large: "l" }, episodes: 12, format: "TV", genres: ["Romance", "Harem"], isAdult: false },
          },
          {
            rating: 70,
            mediaRecommendation: { id: 204, title: { english: "Adult Rec" }, coverImage: { large: "l" }, episodes: 12, format: "TV", genres: ["Action"], isAdult: true },
          },
          {
            rating: 60,
            mediaRecommendation: { id: 205, title: { english: "Unverified Rec" }, coverImage: { large: "l" }, episodes: 12, format: "TV", genres: null, isAdult: false },
          },
        ],
      },
    },
  };

  const recs = mapRecommendations(detailsData);
  assert(recs.length === 1, "mapRecommendations filters out Ecchi, Harem, Adult, and unverified");
  assert(recs[0].id === 201, "Only safe recommendation is mapped");
}

// 5. Details Page Relations Mapping
{
  const relationsData = {
    Media: {
      id: 300,
      isAdult: false,
      genres: ["Action"],
      relations: {
        edges: [
          { relationType: "SEQUEL", node: { id: 301, title: { english: "Safe Sequel" }, coverImage: { large: "l" }, format: "TV", status: "FINISHED", genres: ["Action"], isAdult: false } },
          { relationType: "SPIN_OFF", node: { id: 302, title: { english: "Ecchi Spin-off" }, coverImage: { large: "l" }, format: "TV", status: "FINISHED", genres: ["Comedy", "Ecchi"], isAdult: false } },
          { relationType: "SIDE_STORY", node: { id: 303, title: { english: "Harem Side Story" }, coverImage: { large: "l" }, format: "TV", status: "FINISHED", genres: ["Harem"], isAdult: false } },
          { relationType: "ALTERNATIVE", node: { id: 304, title: { english: "Adult Alt" }, coverImage: { large: "l" }, format: "TV", status: "FINISHED", genres: ["Action"], isAdult: true } },
          { relationType: "CHARACTER", node: { id: 305, title: { english: "No Genre Entry" }, coverImage: { large: "l" }, format: "TV", status: "FINISHED", genres: [], isAdult: false } },
        ],
      },
    },
  };

  const relations = mapRelations(relationsData);
  assert(relations.length === 1, "mapRelations filters out Ecchi, Harem, Adult, and unverified");
  assert(relations[0].id === 301, "Only safe sequel relation mapped");
}

// 6. Details Page Seasons Traversal
{
  const seasonsData = {
    Media: {
      id: 400,
      isAdult: false,
      genres: ["Action"],
      relations: {
        edges: [
          { relationType: "SEQUEL", node: { id: 401, title: { english: "Season 2" }, coverImage: { large: "l" }, format: "TV", status: "FINISHED", genres: ["Action"], isAdult: false } },
          { relationType: "SEQUEL", node: { id: 402, title: { english: "Ecchi Season" }, coverImage: { large: "l" }, format: "TV", status: "FINISHED", genres: ["Ecchi"], isAdult: false } },
        ],
      },
    },
  };

  const detailsMock = {
    id: 400,
    title: { english: "Season 1", romaji: "Season 1", native: null },
    coverImage: { large: "l", extraLarge: "l", color: null },
    format: "TV",
    status: "FINISHED",
    genres: ["Action"],
  };

  const seasons = mapSeasons(seasonsData, detailsMock as any);
  assert(seasons.length === 2, "mapSeasons includes Season 1 and safe Season 2");
  assert(!seasons.some(s => s.id === 402), "mapSeasons excludes Ecchi sequel from seasons list");
}

// 7. Pagination and Result Count Preservation (Requirement 7)
{
  // Simulating 25 candidate items returned from upstream with 5 excluded items:
  const candidates = Array.from({ length: 25 }, (_, i) => {
    const isExcluded = i % 5 === 0; // 5 items excluded (0, 5, 10, 15, 20)
    return {
      id: i + 1,
      title: { english: `Anime ${i + 1}` },
      genres: isExcluded ? ["Action", "Ecchi"] : ["Action", "Adventure"],
      isAdult: false,
    };
  });

  const filtered = filterAllowedAnime(candidates);
  assert(filtered.length === 20, "25 candidates filtered by 5 Ecchi items yields exactly 20 safe items");
  assert(filtered.slice(0, 20).length === 20, "Visible result count preserved at exactly 20 without shortfall");
}

console.log(`\n========================================`);
console.log(`Catalog Filtering Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
