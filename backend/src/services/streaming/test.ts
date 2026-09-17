import { mapAnimeToGogoanime } from "../anime/anime-mapping.service.js";

const result = await mapAnimeToGogoanime(21);

console.dir(result, { depth: null });