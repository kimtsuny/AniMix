-- AlterTable
ALTER TABLE "AnimeSeason" ADD COLUMN     "anilistId" INTEGER;

-- AlterTable
ALTER TABLE "EpisodeProviderMapping" ADD COLUMN     "providerSeasonMappingId" INTEGER;

-- CreateTable
CREATE TABLE "AnimeSeasonProviderMapping" (
    "id" SERIAL NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "partNumber" INTEGER NOT NULL DEFAULT 1,
    "episodeOffset" INTEGER NOT NULL DEFAULT 0,
    "episodeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimeSeasonProviderMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnimeSeasonProviderMapping_seasonId_idx" ON "AnimeSeasonProviderMapping"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "AnimeSeasonProviderMapping_seasonId_provider_partNumber_key" ON "AnimeSeasonProviderMapping"("seasonId", "provider", "partNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AnimeSeasonProviderMapping_provider_providerId_key" ON "AnimeSeasonProviderMapping"("provider", "providerId");

-- CreateIndex
CREATE INDEX "AnimeSeason_anilistId_idx" ON "AnimeSeason"("anilistId");

-- CreateIndex
CREATE INDEX "EpisodeProviderMapping_providerSeasonMappingId_idx" ON "EpisodeProviderMapping"("providerSeasonMappingId");

-- AddForeignKey
ALTER TABLE "AnimeSeasonProviderMapping" ADD CONSTRAINT "AnimeSeasonProviderMapping_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "AnimeSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeProviderMapping" ADD CONSTRAINT "EpisodeProviderMapping_providerSeasonMappingId_fkey" FOREIGN KEY ("providerSeasonMappingId") REFERENCES "AnimeSeasonProviderMapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;
