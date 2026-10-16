import { parseAnimeRecommendations } from "@/features/anime/api/services/details/recommendations.service";

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

console.log("--- Testing You Might Like Recommendation Logic ---\n");

// 1. Basic parsing of verified relations and recommendations
{
  const mockData = {
    Media: {
      id: 100,
      isAdult: false,
      genres: ["Action", "Adventure"],
      relations: {
        edges: [
          {
            relationType: "SEQUEL",
            node: {
              id: 101,
              isAdult: false,
              genres: ["Action", "Adventure"],
              type: "ANIME",
              title: { english: "Anime Season 2", romaji: "Anime 2" },
              coverImage: { large: "https://example.com/season2.jpg" },
              format: "TV",
              averageScore: 85,
              startDate: { year: 2022 },
              episodes: 12,
            },
          },
        ],
      },
      recommendations: {
        nodes: [
          {
            rating: 150,
            mediaRecommendation: {
              id: 200,
              isAdult: false,
              genres: ["Adventure", "Fantasy"],
              title: { english: "Similar Anime", romaji: "Similar" },
              coverImage: { large: "https://example.com/similar.jpg" },
              format: "TV",
              averageScore: 90,
              startDate: { year: 2021 },
              episodes: 24,
            },
          },
        ],
      },
    },
  };

  const recs = parseAnimeRecommendations(mockData, 100);
  assert(recs.length === 2, "Parses both relations and recommendations");
  assert(recs[0].id === 101, "Relation appears first");
  assert(recs[0].title === "Anime Season 2", "Relation title mapped correctly");
  assert(recs[0].relationType === "SEQUEL", "Relation type mapped correctly");
  assert(recs[0].rating === 8.5, "Score divided by 10 for rating");
  assert(recs[1].id === 200, "Recommendation appears second");
  assert(recs[1].rating === 9.0, "Recommendation rating mapped");
}

// 2. Strict exclusion of currently watched anime
{
  const mockData = {
    Media: {
      id: 500,
      isAdult: false,
      genres: ["Action"],
      relations: {
        edges: [
          {
            relationType: "CURRENT",
            node: {
              id: 500, // Same as currently watched anime
              isAdult: false,
              genres: ["Action"],
              type: "ANIME",
              title: { english: "Self In Relations" },
              coverImage: { large: "https://example.com/self.jpg" },
            },
          },
        ],
      },
      recommendations: {
        nodes: [
          {
            mediaRecommendation: {
              id: 500, // Same as currently watched anime
              isAdult: false,
              genres: ["Action"],
              title: { english: "Self In Recs" },
              coverImage: { large: "https://example.com/self2.jpg" },
            },
          },
          {
            mediaRecommendation: {
              id: 501,
              isAdult: false,
              genres: ["Action"],
              title: { english: "Valid Rec" },
              coverImage: { large: "https://example.com/valid.jpg" },
            },
          },
        ],
      },
    },
  };

  const recs = parseAnimeRecommendations(mockData, 500);
  assert(recs.length === 1, "Excludes currently watched anime ID from both relations and recs");
  assert(recs[0].id === 501, "Only non-self recommendation returned");
}

// 3. Strict exclusion of adult-only content
{
  const mockData = {
    Media: {
      id: 600,
      isAdult: false,
      genres: ["Action"],
      relations: {
        edges: [
          {
            relationType: "SIDE_STORY",
            node: {
              id: 601,
              isAdult: true, // Adult relation
              genres: ["Action"],
              type: "ANIME",
              title: { english: "Adult Side Story" },
              coverImage: { large: "https://example.com/adult1.jpg" },
            },
          },
        ],
      },
      recommendations: {
        nodes: [
          {
            mediaRecommendation: {
              id: 602,
              isAdult: true, // Adult recommendation
              genres: ["Action"],
              title: { english: "Adult Recommendation" },
              coverImage: { large: "https://example.com/adult2.jpg" },
            },
          },
          {
            mediaRecommendation: {
              id: 603,
              isAdult: false,
              genres: ["Drama"],
              title: { english: "Safe Anime" },
              coverImage: { large: "https://example.com/safe.jpg" },
            },
          },
        ],
      },
    },
  };

  const recs = parseAnimeRecommendations(mockData, 600);
  assert(recs.length === 1, "Excludes adult-only content from both relations and recs");
  assert(recs[0].id === 603, "Only non-adult anime returned");
}

// 4. Strict exclusion of current adult media
{
  const mockAdultData = {
    Media: {
      id: 700,
      isAdult: true,
      genres: ["Action"],
      recommendations: { nodes: [] },
    },
  };

  const recs = parseAnimeRecommendations(mockAdultData, 700);
  assert(recs.length === 0, "Returns empty if current anime is marked adult");
}

// 5. Relations filtering: only include type === 'ANIME'
{
  const mockData = {
    Media: {
      id: 800,
      isAdult: false,
      genres: ["Action"],
      relations: {
        edges: [
          {
            relationType: "SOURCE",
            node: {
              id: 801,
              isAdult: false,
              genres: ["Action"],
              type: "MANGA", // Manga source
              title: { english: "Manga Source" },
              coverImage: { large: "https://example.com/manga.jpg" },
            },
          },
          {
            relationType: "ADAPTATION",
            node: {
              id: 802,
              isAdult: false,
              genres: ["Action"],
              type: "NOVEL", // Light novel
              title: { english: "Light Novel" },
              coverImage: { large: "https://example.com/novel.jpg" },
            },
          },
          {
            relationType: "SPIN_OFF",
            node: {
              id: 803,
              isAdult: false,
              genres: ["Action"],
              type: "ANIME", // Anime spin-off
              title: { english: "Anime Spin-off" },
              coverImage: { large: "https://example.com/spinoff.jpg" },
            },
          },
        ],
      },
    },
  };

  const recs = parseAnimeRecommendations(mockData, 800);
  assert(recs.length === 1, "Filters out MANGA and NOVEL relations");
  assert(recs[0].id === 803, "Includes ANIME relations");
}

// 6. Deduplication: when an anime is in both relations and recommendations
{
  const mockData = {
    Media: {
      id: 900,
      isAdult: false,
      genres: ["Action"],
      relations: {
        edges: [
          {
            relationType: "SEQUEL",
            node: {
              id: 901,
              isAdult: false,
              genres: ["Action"],
              type: "ANIME",
              title: { english: "Sequel Anime" },
              coverImage: { large: "https://example.com/sequel.jpg" },
            },
          },
        ],
      },
      recommendations: {
        nodes: [
          {
            mediaRecommendation: {
              id: 901, // Duplicate ID
              isAdult: false,
              genres: ["Action"],
              title: { english: "Sequel In Recs" },
              coverImage: { large: "https://example.com/sequel.jpg" },
            },
          },
          {
            mediaRecommendation: {
              id: 902,
              isAdult: false,
              genres: ["Action"],
              title: { english: "Another Rec" },
              coverImage: { large: "https://example.com/rec.jpg" },
            },
          },
        ],
      },
    },
  };

  const recs = parseAnimeRecommendations(mockData, 900);
  assert(recs.length === 2, "Deduplicates anime present in both relations and recommendations");
  assert(recs.map(r => r.id).join(",") === "901,902", "Deduplicated order preserved");
}

// 7. Ecchi genre exclusion in relations and recommendations
{
  const mockData = {
    Media: {
      id: 1100,
      isAdult: false,
      genres: ["Action", "Sci-Fi"],
      relations: {
        edges: [
          {
            relationType: "SIDE_STORY",
            node: {
              id: 1101,
              isAdult: false,
              genres: ["Action", "Ecchi"], // Excluded by Ecchi
              type: "ANIME",
              title: { english: "Ecchi Side Story" },
              coverImage: { large: "https://example.com/ecchi1.jpg" },
            },
          },
        ],
      },
      recommendations: {
        nodes: [
          {
            mediaRecommendation: {
              id: 1102,
              isAdult: false,
              genres: ["Comedy", "Ecchi"], // Excluded by Ecchi
              title: { english: "Ecchi Rec" },
              coverImage: { large: "https://example.com/ecchi2.jpg" },
            },
          },
          {
            mediaRecommendation: {
              id: 1103,
              isAdult: false,
              genres: ["Comedy", "Fantasy"], // Safe
              title: { english: "Safe Fantasy" },
              coverImage: { large: "https://example.com/safe.jpg" },
            },
          },
        ],
      },
    },
  };

  const recs = parseAnimeRecommendations(mockData, 1100);
  assert(recs.length === 1, "Excludes Ecchi relations and recommendations");
  assert(recs[0].id === 1103, "Retains safe non-Ecchi recommendation");
}

// 8. Harem genre exclusion in relations and recommendations
{
  const mockData = {
    Media: {
      id: 1200,
      isAdult: false,
      genres: ["Action", "Adventure"],
      relations: {
        edges: [
          {
            relationType: "SPIN_OFF",
            node: {
              id: 1201,
              isAdult: false,
              genres: ["Romance", "Harem"], // Excluded by Harem
              type: "ANIME",
              title: { english: "Harem Spin-off" },
              coverImage: { large: "https://example.com/harem1.jpg" },
            },
          },
        ],
      },
      recommendations: {
        nodes: [
          {
            mediaRecommendation: {
              id: 1202,
              isAdult: false,
              genres: ["Comedy", "Harem"], // Excluded by Harem
              title: { english: "Harem Rec" },
              coverImage: { large: "https://example.com/harem2.jpg" },
            },
          },
          {
            mediaRecommendation: {
              id: 1203,
              isAdult: false,
              genres: ["Drama", "Mystery"], // Safe
              title: { english: "Safe Drama" },
              coverImage: { large: "https://example.com/safe.jpg" },
            },
          },
        ],
      },
    },
  };

  const recs = parseAnimeRecommendations(mockData, 1200);
  assert(recs.length === 1, "Excludes Harem relations and recommendations");
  assert(recs[0].id === 1203, "Retains safe non-Harem recommendation");
}

// 9. Both Ecchi and Harem genres present simultaneously
{
  const mockData = {
    Media: {
      id: 1300,
      isAdult: false,
      genres: ["Action"],
      recommendations: {
        nodes: [
          {
            mediaRecommendation: {
              id: 1301,
              isAdult: false,
              genres: ["Ecchi", "Harem", "Comedy"],
              title: { english: "Both Excluded Genres" },
              coverImage: { large: "https://example.com/both.jpg" },
            },
          },
          {
            mediaRecommendation: {
              id: 1302,
              isAdult: false,
              genres: ["Action", "Sci-Fi"],
              title: { english: "Ordinary Safe" },
              coverImage: { large: "https://example.com/ordinary.jpg" },
            },
          },
        ],
      },
    },
  };

  const recs = parseAnimeRecommendations(mockData, 1300);
  assert(recs.length === 1, "Excludes anime with both Ecchi and Harem present");
  assert(recs[0].id === 1302, "Ordinary safe anime remains visible");
}

// 10. Current watched anime itself has Ecchi or Harem
{
  const ecchiCurrent = {
    Media: {
      id: 1400,
      isAdult: false,
      genres: ["Comedy", "Ecchi"],
      recommendations: {
        nodes: [
          {
            mediaRecommendation: {
              id: 1401,
              isAdult: false,
              genres: ["Action"],
              title: { english: "Rec" },
              coverImage: { large: "https://example.com/rec.jpg" },
            },
          },
        ],
      },
    },
  };
  assert(parseAnimeRecommendations(ecchiCurrent, 1400).length === 0, "Returns empty if current anime has Ecchi genre");

  const haremCurrent = {
    Media: {
      id: 1402,
      isAdult: false,
      genres: ["Romance", "Harem"],
      recommendations: {
        nodes: [
          {
            mediaRecommendation: {
              id: 1403,
              isAdult: false,
              genres: ["Action"],
              title: { english: "Rec" },
              coverImage: { large: "https://example.com/rec.jpg" },
            },
          },
        ],
      },
    },
  };
  assert(parseAnimeRecommendations(haremCurrent, 1402).length === 0, "Returns empty if current anime has Harem genre");
}

// 11. Case normalization and exact genre matching
{
  const mockData = {
    Media: {
      id: 1500,
      isAdult: false,
      genres: ["Action"],
      recommendations: {
        nodes: [
          {
            mediaRecommendation: {
              id: 1501,
              isAdult: false,
              genres: ["  ecchi  "], // Lowercase and padded whitespace
              title: { english: "Padded Ecchi" },
              coverImage: { large: "https://example.com/ecchi.jpg" },
            },
          },
          {
            mediaRecommendation: {
              id: 1502,
              isAdult: false,
              genres: ["HAREM"], // Uppercase
              title: { english: "Uppercase Harem" },
              coverImage: { large: "https://example.com/harem.jpg" },
            },
          },
          {
            mediaRecommendation: {
              id: 1503,
              isAdult: false,
              genres: ["Action", "Adventure"], // Ordinary safe
              title: { english: "Safe Ordinary" },
              coverImage: { large: "https://example.com/safe.jpg" },
            },
          },
        ],
      },
    },
  };

  const recs = parseAnimeRecommendations(mockData, 1500);
  assert(recs.length === 1, "Excludes variations of casing and whitespace");
  assert(recs[0].id === 1503, "Safe ordinary anime remains visible");
}

// 12. Missing genre metadata safety (Requirement 6)
{
  const missingGenresInRec = {
    Media: {
      id: 1600,
      isAdult: false,
      genres: ["Action"],
      recommendations: {
        nodes: [
          {
            mediaRecommendation: {
              id: 1601,
              isAdult: false,
              // genres missing
              title: { english: "Missing Genres Rec" },
              coverImage: { large: "https://example.com/nogenres.jpg" },
            },
          },
          {
            mediaRecommendation: {
              id: 1602,
              isAdult: false,
              genres: null, // null genres
              title: { english: "Null Genres Rec" },
              coverImage: { large: "https://example.com/nullgenres.jpg" },
            },
          },
          {
            mediaRecommendation: {
              id: 1603,
              isAdult: false,
              genres: [], // empty genres
              title: { english: "Empty Genres Rec" },
              coverImage: { large: "https://example.com/emptygenres.jpg" },
            },
          },
          {
            mediaRecommendation: {
              id: 1604,
              isAdult: false,
              genres: ["Action"], // Verified genres
              title: { english: "Verified Rec" },
              coverImage: { large: "https://example.com/verified.jpg" },
            },
          },
        ],
      },
    },
  };

  const recs = parseAnimeRecommendations(missingGenresInRec, 1600);
  assert(recs.length === 1, "Excludes unverified missing/null/empty genre recommendations");
  assert(recs[0].id === 1604, "Only recommendation with verified genres is returned");

  // Current anime missing genres
  const currentMissing = {
    Media: {
      id: 1650,
      isAdult: false,
      // genres missing
      recommendations: { nodes: [] },
    },
  };
  assert(parseAnimeRecommendations(currentMissing, 1650).length === 0, "Returns empty if current anime genres are missing");
}

// 13. Graceful handling of missing or partial data
{
  const nullData = parseAnimeRecommendations(null, 100);
  assert(nullData.length === 0, "Handles null data gracefully");

  const undefinedData = parseAnimeRecommendations(undefined, 100);
  assert(undefinedData.length === 0, "Handles undefined data gracefully");

  const emptyMedia = parseAnimeRecommendations({ Media: null }, 100);
  assert(emptyMedia.length === 0, "Handles empty Media gracefully");

  const missingImage = parseAnimeRecommendations({
    Media: {
      id: 1000,
      isAdult: false,
      genres: ["Action"],
      recommendations: {
        nodes: [
          {
            mediaRecommendation: {
              id: 1001,
              isAdult: false,
              genres: ["Action"],
              title: { english: "No Image" },
              coverImage: { large: null },
            },
          },
        ],
      },
    },
  }, 1000);
  assert(missingImage.length === 0, "Ignores recommendations with missing cover images");
}

console.log(`\n========================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
