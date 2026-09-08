/**
 * Mock data for the Watch page UI.
 * This data is used to render the design while the API integration is pending.
 * Replace with real API calls when the backend is ready.
 */

export interface MockEpisode {
  id: number;
  number: number;
  title: string;
  duration: string;
  thumbnail: string;
}

export interface MockRecommendation {
  id: number;
  title: string;
  image: string;
  rating: number;
  year: number;
  episodes: number;
}

export const MOCK_ANIME = {
  id: "the-promised-neverland",
  title: "The Promised Neverland",
  cover: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101759-NhSwxv7TnFPm.jpg",
  banner: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/101759-MhlCoeqofgps.jpg",
};

export const MOCK_EPISODES: MockEpisode[] = [
  {
    id: 1,
    number: 8,
    title: "Episode 8",
    duration: "23:23",
    thumbnail: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101759-NhSwxv7TnFPm.jpg",
  },
  {
    id: 2,
    number: 9,
    title: "Episode 9",
    duration: "23:23",
    thumbnail: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101759-NhSwxv7TnFPm.jpg",
  },
  {
    id: 3,
    number: 10,
    title: "Episode 10",
    duration: "23:23",
    thumbnail: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101759-NhSwxv7TnFPm.jpg",
  },
  {
    id: 4,
    number: 11,
    title: "Episode 11",
    duration: "23:23",
    thumbnail: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101759-NhSwxv7TnFPm.jpg",
  },
  {
    id: 5,
    number: 12,
    title: "Episode 12",
    duration: "23:55",
    thumbnail: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101759-NhSwxv7TnFPm.jpg",
  },
  {
    id: 6,
    number: 13,
    title: "Episode 13",
    duration: "23:23",
    thumbnail: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101759-NhSwxv7TnFPm.jpg",
  },
  {
    id: 7,
    number: 14,
    title: "Episode 14",
    duration: "23:23",
    thumbnail: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101759-NhSwxv7TnFPm.jpg",
  },
];

export const MOCK_RECOMMENDATIONS: MockRecommendation[] = [
  {
    id: 1,
    title: "Attack on Titan",
    image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-C6FPmWm59CyP.jpg",
    rating: 8.5,
    year: 2013,
    episodes: 25,
  },
  {
    id: 2,
    title: "Hunter x Hunter (2011)",
    image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx11061-NpIIobuTOCKy.png",
    rating: 9.04,
    year: 2011,
    episodes: 148,
  },
  {
    id: 3,
    title: "Shingeki no Kyojin",
    image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-C6FPmWm59CyP.jpg",
    rating: 8.5,
    year: 2013,
    episodes: 25,
  },
  {
    id: 4,
    title: "Yakusoku no Neverland",
    image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101759-NhSwxv7TnFPm.jpg",
    rating: 8.63,
    year: 2019,
    episodes: 12,
  },
  {
    id: 5,
    title: "Death Note",
    image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1535-lawCwhzhi96X.jpg",
    rating: 8.62,
    year: 2006,
    episodes: 37,
  },
  {
    id: 6,
    title: "Fullmetal Alchemist: Brotherhood",
    image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx5114-KJTQz9AIm6Wk.jpg",
    rating: 9.11,
    year: 2009,
    episodes: 64,
  },
  {
    id: 7,
    title: "Demon Slayer: Kimetsu no Yaiba",
    image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-PEn1CTc93blC.jpg",
    rating: 8.71,
    year: 2019,
    episodes: 26,
  },
  {
    id: 8,
    title: "Steins;Gate",
    image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx9253-7qHGrc3ypuIV.jpg",
    rating: 9.08,
    year: 2011,
    episodes: 24,
  },
];

export const MOCK_SEASONS = [
  { id: 1, label: "Season 1", value: "1" },
  { id: 2, label: "Season 2", value: "2" },
];
