import { gogoanimeProvider } from "../streaming/providers/gogoanime.provider.js";

const episodes = await gogoanimeProvider.getEpisodes(
  "gogoanime:/watch/one-piece"
);

console.dir(episodes, { depth: null });