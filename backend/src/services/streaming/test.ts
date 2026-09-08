/**
 * Simple streaming test — run with:
 *   pnpm exec tsx src/services/streaming/test.ts
 */
import { getEpisodeStream } from "./providers/gogoanime.provider.js";

const result = await getEpisodeStream("/watch/one-piece/ep-1");

console.dir(result, { depth: null });
