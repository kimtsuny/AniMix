interface AnimeHeroSlide {
    id: string;
    title: string;
    status: string;
    rating: number;
    year: number;
    type: string;
    episodes: number;
    duration: string;
    genres: string[];
    description: string;
    imagePath: string;
}

export const mockHeroSlides: AnimeHeroSlide[] = [
    {
        id: "Kimi No Wa",
        title: "Kimi No Wa",
        status: "Trending",
        rating: 9.8,
        year: 2024,
        type: "TV",
        episodes: 12,
        duration: "24m",
        genres: ["Action", "Adventure", "Fantasy"],
        description: "In a world where hunters must battle deadly monsters to protect mankind, Sung Jinwoo, a notoriously weak hunter, finds himself in a struggle for survival in a dangerous double dungeon.",
        imagePath: "/animeHero/1.jpg",
    },
    {
        id: "jjk",
        title: "Jujutsu Kaisen",
        status: "Popular",
        rating: 9.9,
        year: 2023,
        type: "TV",
        episodes: 47,
        duration: "24m",
        genres: ["Action", "Supernatural", "Fantasy"],
        description: "A boy swallows a cursed talisman - the finger of a demon - and becomes cursed himself. He enters a shaman's school to be able to locate the demon's other body parts and thus exorcise himself.",
        imagePath: "/animeHero/3.jpg",
    },
    {
        id: "aot",
        title: "Attack on Titan",
        status: "Popular",
        rating: 9.9,
        year: 2023,
        type: "TV",
        episodes: 94,
        duration: "25m",
        genres: ["Action", "Drama", "Fantasy"],
        description: "Centuries ago, mankind was slaughtered to near extinction by monstrous humanoid creatures called Titans, forcing humans to hide in fear behind enormous concentric walls.",
        imagePath: "/animeHero/4.jpg",
    },
    {
        id: "demon-slayer",
        title: "Demon Slayer",
        status: "Trending",
        rating: 9.7,
        year: 2024,
        type: "TV",
        episodes: 55,
        duration: "24m",
        genres: ["Action", "Fantasy", "Historical"],
        description: "Tanjiro Kamado, a kindhearted boy who sells charcoal for a living, finds his family slaughtered by a demon. To make things worse, his younger sister Nezuko has been turned into a demon herself.",
        imagePath: "/animeHero/6.jpg",
    },
    {
        id: "spy-family",
        title: "Spy × Family",
        status: "New Season",
        rating: 9.6,
        year: 2023,
        type: "TV",
        episodes: 37,
        duration: "24m",
        genres: ["Action", "Comedy", "Slice of Life"],
        description: "A spy on an undercover mission marries an assassin and adopts a telepathic child as part of his cover, unaware of their secret identities.",
        imagePath: "/animeHero/7.jpg",
    },
];
