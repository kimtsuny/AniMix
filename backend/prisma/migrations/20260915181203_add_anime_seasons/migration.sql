/*
  Warnings:

  - You are about to drop the column `animeId` on the `Episode` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[seasonId,number]` on the table `Episode` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `seasonId` to the `Episode` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Episode" DROP CONSTRAINT "Episode_animeId_fkey";

-- DropIndex
DROP INDEX "Episode_animeId_number_key";

-- AlterTable
ALTER TABLE "Episode" DROP COLUMN "animeId",
ADD COLUMN     "seasonId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "AnimeSeason" (
    "id" SERIAL NOT NULL,
    "animeId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT,
    "provider" TEXT,
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimeSeason_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnimeSeason_animeId_number_key" ON "AnimeSeason"("animeId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "AnimeSeason_provider_providerId_key" ON "AnimeSeason"("provider", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_seasonId_number_key" ON "Episode"("seasonId", "number");

-- AddForeignKey
ALTER TABLE "AnimeSeason" ADD CONSTRAINT "AnimeSeason_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "AnimeSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;
