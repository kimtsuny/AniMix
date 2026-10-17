import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { GetSeasonEpisodesResponse } from "@/features/watch/api/services/episode.service";

describe("Details Page Seasons & Episodes AniMix Integration", () => {
  const mockWatchResponse: GetSeasonEpisodesResponse = {
    anime: {
      id: 1,
      anilistId: 16498, // Attack on Titan root
      title: "Attack on Titan",
      description: "Centuries ago, mankind was slaughtered...",
      coverImage: "https://s4.anilist.co/cover.jpg",
      bannerImage: "https://s4.anilist.co/banner.jpg",
    },
    seasons: [
      {
        id: 101,
        number: 1,
        title: "Season 1",
        episodeCount: 25,
        anilistId: 16498,
        anilistIds: [16498],
      },
      {
        id: 102,
        number: 2,
        title: "Season 2",
        episodeCount: 12,
        anilistId: 20958,
        anilistIds: [20958],
      },
      {
        id: 103,
        number: 3,
        title: "Season 3",
        episodeCount: 22,
        anilistId: 99147,
        anilistIds: [99147, 104578],
      },
      {
        id: 104,
        number: 4,
        title: "The Final Season",
        episodeCount: 28,
        anilistId: 110277,
        anilistIds: [110277],
      },
    ],
    season: {
      id: 102,
      number: 2,
      title: "Season 2",
      anilistId: 20958,
      episodes: [
        {
          id: 201,
          number: 1,
          title: "Beast Titan",
          thumbnail: "https://s4.anilist.co/ep1-thumb.jpg",
          provider: "anikoto",
          providerId: "ep-1",
        },
        {
          id: 202,
          number: 2,
          title: "I'm Home",
          thumbnail: null,
          provider: "anikoto",
          providerId: "ep-2",
        },
      ],
    },
  };

  it("maps AniMix seasons preserving exact AniList IDs and season numbers", () => {
    const seasons = mockWatchResponse.seasons.map((s) => ({
      id: s.anilistId ?? s.id ?? s.number,
      number: s.number,
      title: s.title || `Season ${s.number}`,
      coverImage: null,
      relationType: "SEASON",
      format: "TV",
      status: null,
      startDate: null,
    }));

    assert.equal(seasons.length, 4);
    assert.equal(seasons[0].id, 16498);
    assert.equal(seasons[0].number, 1);
    assert.equal(seasons[1].id, 20958);
    assert.equal(seasons[1].number, 2);
    assert.equal(seasons[2].id, 99147);
    assert.equal(seasons[2].number, 3);
    assert.equal(seasons[3].id, 110277);
    assert.equal(seasons[3].number, 4);

    // Verify seasons are NOT assuming anilistId === season number
    assert.notEqual(seasons[1].id, seasons[1].number);
  });

  it("maps AniMix episodes to details format with internal watch URLs", () => {
    const rootAnimeId = mockWatchResponse.anime.anilistId;
    const seasonNumber = mockWatchResponse.season.number;

    const episodes = mockWatchResponse.season.episodes.map((ep) => ({
      number: ep.number,
      title: ep.title
        ? ep.title.startsWith("Episode ")
          ? ep.title
          : `Episode ${ep.number} - ${ep.title}`
        : `Episode ${ep.number}`,
      thumbnail: ep.thumbnail,
      url: `/watch/${rootAnimeId}/${seasonNumber}/${ep.number}`,
      site: "AniMix",
    }));

    assert.equal(episodes.length, 2);
    assert.equal(episodes[0].number, 1);
    assert.equal(episodes[0].title, "Episode 1 - Beast Titan");
    assert.equal(episodes[0].url, "/watch/16498/2/1");
    assert.equal(episodes[0].thumbnail, "https://s4.anilist.co/ep1-thumb.jpg");

    assert.equal(episodes[1].number, 2);
    assert.equal(episodes[1].title, "Episode 2 - I'm Home");
    assert.equal(episodes[1].url, "/watch/16498/2/2");
    assert.equal(episodes[1].thumbnail, null);
  });

  it("resolves season number correctly when viewing a sequel anime directly", () => {
    // When a user opens /anime/20958 (AoT Season 2)
    const currentAnimeId = 20958;
    const seasons = mockWatchResponse.seasons.map((s) => ({
      id: s.anilistId ?? s.id ?? s.number,
      number: s.number,
      title: s.title,
    }));

    const matchedSeason = seasons.find((s) => s.id === currentAnimeId);
    assert.ok(matchedSeason);
    assert.equal(matchedSeason.number, 2);
  });

  it("excludes TV seasons from related content using exact AniList season IDs", () => {
    const seasons = mockWatchResponse.seasons.map((s) => ({
      id: s.anilistId ?? s.id ?? s.number,
      number: s.number,
    }));
    const seasonIds = new Set(seasons.map((s) => s.id));

    const relations = [
      { id: 20958, title: "Attack on Titan Season 2", relationType: "SEQUEL" }, // Should be excluded
      { id: 99147, title: "Attack on Titan Season 3", relationType: "SEQUEL" }, // Should be excluded
      { id: 21172, title: "Attack on Titan: Junior High", relationType: "SPIN_OFF" }, // Should be KEPT
      { id: 20739, title: "Attack on Titan: No Regrets", relationType: "SIDE_STORY" }, // Should be KEPT
    ];

    const relatedContent = relations.filter((r) => !seasonIds.has(r.id));
    assert.equal(relatedContent.length, 2);
    assert.equal(relatedContent[0].id, 21172);
    assert.equal(relatedContent[1].id, 20739);
  });
});
