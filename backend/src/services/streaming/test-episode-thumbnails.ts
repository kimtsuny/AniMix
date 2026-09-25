import {
  AnimeParadiseProvider,
  HttpClient,
} from "anime-sdk";

const http = new HttpClient({
  timeoutMs: 25000,
});

const provider = new AnimeParadiseProvider(http);

// ضع هنا providerId لأنمي تعرف أنه يحتوي على حلقات
const mediaId = "PUT_MEDIA_ID_HERE";

const episodes =
  await provider.fetchContentUnits(mediaId);

console.log(
  JSON.stringify(episodes.slice(0, 3), null, 2)
);
