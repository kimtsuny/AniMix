import { mapAnimeToAnimeParadise } from "../anime/anime-mapping.service.js";

const result = await mapAnimeToAnimeParadise(21);

console.dir(result, { depth: null });