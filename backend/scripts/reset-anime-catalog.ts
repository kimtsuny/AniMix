import fs from "node:fs";
import path from "node:path";
import prisma from "../src/config/prisma.js";

function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
}

function escapeSqlValue(val: any): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return val.toString();
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${val.toString().replace(/'/g, "''")}'`;
}

function generateTableInserts(tableName: string, rows: any[]): string {
  if (rows.length === 0) return `-- No rows in "${tableName}"\n\n`;

  const columns = Object.keys(rows[0]);
  const colList = columns.map((c) => `"${c}"`).join(", ");

  let sql = `-- Table: "${tableName}" (${rows.length} rows)\n`;
  for (const row of rows) {
    const valList = columns.map((c) => escapeSqlValue(row[c])).join(", ");
    sql += `INSERT INTO "${tableName}" (${colList}) VALUES (${valList});\n`;
  }
  sql += "\n";
  return sql;
}

/**
 * Creates a complete database backup (both SQL INSERT dump and JSON format).
 */
async function createPreResetBackup(timestamp: string): Promise<{ dumpPath: string; jsonPath: string }> {
  const baseName = `backup_before_anime_catalog_reset_${timestamp}`;
  const backupsDir = path.resolve(process.cwd(), "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const dumpPath = path.join(backupsDir, `${baseName}.dump`);
  const jsonPath = path.join(backupsDir, `${baseName}.json`);

  console.log(`[Backup] Generating safety backup before catalog reset...`);

  const [
    users,
    animes,
    seasons,
    episodes,
    seasonMappings,
    episodeMappings,
    animeMappings,
    favorites,
    migrations,
  ] = await Promise.all([
    prisma.user.findMany({ orderBy: { id: "asc" } }),
    prisma.anime.findMany({ orderBy: { id: "asc" } }),
    prisma.animeSeason.findMany({ orderBy: { id: "asc" } }),
    prisma.episode.findMany({ orderBy: { id: "asc" } }),
    prisma.animeSeasonProviderMapping.findMany({ orderBy: { id: "asc" } }),
    prisma.episodeProviderMapping.findMany({ orderBy: { id: "asc" } }),
    prisma.animeProviderMapping.findMany({ orderBy: { id: "asc" } }),
    prisma.favorite.findMany({ orderBy: { id: "asc" } }),
    (prisma as any).$queryRawUnsafe('SELECT * FROM "_prisma_migrations" ORDER BY "finished_at" ASC;') as Promise<any[]>,
  ]);

  const allData = {
    metadata: {
      timestamp,
      createdAt: new Date().toISOString(),
      databaseUrl: process.env.DATABASE_URL?.replace(/:[^:]*@/, ":***@"),
    },
    tables: {
      User: users,
      Anime: animes,
      AnimeSeason: seasons,
      Episode: episodes,
      AnimeSeasonProviderMapping: seasonMappings,
      EpisodeProviderMapping: episodeMappings,
      AnimeProviderMapping: animeMappings,
      Favorite: favorites,
      _prisma_migrations: migrations,
    },
  };

  // 1. Write JSON dump
  fs.writeFileSync(jsonPath, JSON.stringify(allData, null, 2), "utf8");

  // 2. Write SQL transactional dump
  let sqlContent = `-- Database Backup: ${baseName}\n`;
  sqlContent += `-- Created At: ${new Date().toISOString()}\n`;
  sqlContent += `-- PostgreSQL Target\n\n`;
  sqlContent += `BEGIN;\n\n`;

  sqlContent += generateTableInserts("User", users);
  sqlContent += generateTableInserts("Anime", animes);
  sqlContent += generateTableInserts("AnimeSeason", seasons);
  sqlContent += generateTableInserts("AnimeProviderMapping", animeMappings);
  sqlContent += generateTableInserts("AnimeSeasonProviderMapping", seasonMappings);
  sqlContent += generateTableInserts("Episode", episodes);
  sqlContent += generateTableInserts("EpisodeProviderMapping", episodeMappings);
  sqlContent += generateTableInserts("Favorite", favorites);

  sqlContent += `COMMIT;\n`;

  fs.writeFileSync(dumpPath, sqlContent, "utf8");

  console.log(`[Backup] Backup created successfully:`);
  console.log(`  Dump: ${dumpPath} (${(fs.statSync(dumpPath).size / 1024).toFixed(1)} KB)`);
  console.log(`  JSON: ${jsonPath} (${(fs.statSync(jsonPath).size / 1024).toFixed(1)} KB)`);

  return { dumpPath, jsonPath };
}

/**
 * Resets the Anime Catalog while strictly preserving User and account data.
 */
async function main() {
  const timestamp = getTimestamp();

  console.log("\n======================================================================");
  console.log("  ANIME CATALOG RESET SCRIPT");
  console.log("  (Safe clearing of catalog data — User accounts PRESERVED)");
  console.log("======================================================================\n");

  // 1. Query baseline counts BEFORE reset
  console.log("[Reset] Querying baseline counts BEFORE reset...");
  const [
    usersBefore,
    animesBefore,
    seasonsBefore,
    episodesBefore,
    seasonMappingsBefore,
    episodeMappingsBefore,
    animeMappingsBefore,
    favoritesBefore,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.anime.count(),
    prisma.animeSeason.count(),
    prisma.episode.count(),
    prisma.animeSeasonProviderMapping.count(),
    prisma.episodeProviderMapping.count(),
    prisma.animeProviderMapping.count(),
    prisma.favorite.count(),
  ]);

  console.log("BASELINE COUNTS BEFORE RESET:");
  console.log(`  User:                       ${usersBefore} (MUST BE PRESERVED)`);
  console.log(`  Anime:                      ${animesBefore}`);
  console.log(`  AnimeSeason:                ${seasonsBefore}`);
  console.log(`  Episode:                    ${episodesBefore}`);
  console.log(`  AnimeSeasonProviderMapping: ${seasonMappingsBefore}`);
  console.log(`  EpisodeProviderMapping:     ${episodeMappingsBefore}`);
  console.log(`  AnimeProviderMapping:       ${animeMappingsBefore}`);
  console.log(`  Favorite:                   ${favoritesBefore}`);
  console.log("");

  // 2. Create safety backup
  const backup = await createPreResetBackup(timestamp);

  // 3. Execute atomic reset transaction
  console.log("\n[Reset] Starting atomic reset transaction...");

  let deletionSummary: {
    deletedEpisodeMappings: number;
    deletedEpisodes: number;
    deletedSeasonMappings: number;
    deletedSeasons: number;
    deletedAnimeMappings: number;
    deletedFavorites: number;
    deletedAnimes: number;
  };

  try {
    deletionSummary = await prisma.$transaction(
      async (tx) => {
        // Step 1: Delete EpisodeProviderMapping (foreign keys to Episode & AnimeSeasonProviderMapping)
        console.log("  [1/7] Deleting EpisodeProviderMapping records...");
        const resEpMappings = await tx.episodeProviderMapping.deleteMany({});

        // Step 2: Delete Episode records (foreign key to AnimeSeason)
        console.log("  [2/7] Deleting Episode records...");
        const resEpisodes = await tx.episode.deleteMany({});

        // Step 3: Delete AnimeSeasonProviderMapping records (foreign key to AnimeSeason)
        console.log("  [3/7] Deleting AnimeSeasonProviderMapping records...");
        const resSeasonMappings = await tx.animeSeasonProviderMapping.deleteMany({});

        // Step 4: Delete AnimeSeason records (foreign key to Anime)
        console.log("  [4/7] Deleting AnimeSeason records...");
        const resSeasons = await tx.animeSeason.deleteMany({});

        // Step 5: Delete AnimeProviderMapping records (foreign key to Anime)
        console.log("  [5/7] Deleting AnimeProviderMapping records...");
        const resAnimeMappings = await tx.animeProviderMapping.deleteMany({});

        // Step 6: Delete Favorite records that reference Anime (prevent dangling foreign-key references)
        // Note: Favorite references Anime (onDelete: Cascade) and User (onDelete: Cascade)
        console.log("  [6/7] Deleting catalog Favorite records referencing deleted anime...");
        const resFavorites = await tx.favorite.deleteMany({});

        // Step 7: Delete Anime records (root catalog model)
        console.log("  [7/7] Deleting Anime records...");
        const resAnimes = await tx.anime.deleteMany({});

        return {
          deletedEpisodeMappings: resEpMappings.count,
          deletedEpisodes: resEpisodes.count,
          deletedSeasonMappings: resSeasonMappings.count,
          deletedSeasons: resSeasons.count,
          deletedAnimeMappings: resAnimeMappings.count,
          deletedFavorites: resFavorites.count,
          deletedAnimes: resAnimes.count,
        };
      },
      {
        timeout: 60000, // 60s timeout for transaction
      }
    );
  } catch (err: any) {
    console.error("\n❌ [Reset Error] Transaction failed and rolled back!", err);
    throw err;
  }

  console.log("\n[Reset] Transaction committed successfully!");

  // 4. Query and verify counts AFTER reset
  console.log("\n[Reset] Verifying post-reset state...");
  const [
    usersAfter,
    animesAfter,
    seasonsAfter,
    episodesAfter,
    seasonMappingsAfter,
    episodeMappingsAfter,
    animeMappingsAfter,
    favoritesAfter,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.anime.count(),
    prisma.animeSeason.count(),
    prisma.episode.count(),
    prisma.animeSeasonProviderMapping.count(),
    prisma.episodeProviderMapping.count(),
    prisma.animeProviderMapping.count(),
    prisma.favorite.count(),
  ]);

  console.log("\n======================================================================");
  console.log("  RESET VERIFICATION AUDIT");
  console.log("======================================================================");
  console.log(`  User:                       ${usersBefore} -> ${usersAfter} (PRESERVED: ${usersAfter === usersBefore ? "✅ YES" : "❌ NO"})`);
  console.log(`  Anime:                      ${animesBefore} -> ${animesAfter} (EMPTY: ${animesAfter === 0 ? "✅ YES" : "❌ NO"})`);
  console.log(`  AnimeSeason:                ${seasonsBefore} -> ${seasonsAfter} (EMPTY: ${seasonsAfter === 0 ? "✅ YES" : "❌ NO"})`);
  console.log(`  Episode:                    ${episodesBefore} -> ${episodesAfter} (EMPTY: ${episodesAfter === 0 ? "✅ YES" : "❌ NO"})`);
  console.log(`  AnimeSeasonProviderMapping: ${seasonMappingsBefore} -> ${seasonMappingsAfter} (EMPTY: ${seasonMappingsAfter === 0 ? "✅ YES" : "❌ NO"})`);
  console.log(`  EpisodeProviderMapping:     ${episodeMappingsBefore} -> ${episodeMappingsAfter} (EMPTY: ${episodeMappingsAfter === 0 ? "✅ YES" : "❌ NO"})`);
  console.log(`  AnimeProviderMapping:       ${animeMappingsBefore} -> ${animeMappingsAfter} (EMPTY: ${animeMappingsAfter === 0 ? "✅ YES" : "❌ NO"})`);
  console.log(`  Favorite:                   ${favoritesBefore} -> ${favoritesAfter} (EMPTY: ${favoritesAfter === 0 ? "✅ YES" : "❌ NO"})`);
  console.log("======================================================================\n");

  // Integrity checks
  if (usersAfter !== usersBefore) {
    throw new Error(`CRITICAL INTEGRITY FAILURE: User count changed from ${usersBefore} to ${usersAfter}!`);
  }
  if (
    animesAfter !== 0 ||
    seasonsAfter !== 0 ||
    episodesAfter !== 0 ||
    seasonMappingsAfter !== 0 ||
    episodeMappingsAfter !== 0 ||
    animeMappingsAfter !== 0 ||
    favoritesAfter !== 0
  ) {
    throw new Error("INCOMPLETE RESET: One or more catalog tables still contain records!");
  }

  // Verify that the surviving user accounts are intact
  const survivingUsers = await prisma.user.findMany({ select: { id: true, username: true, email: true } });
  console.log("Surviving User accounts:");
  for (const u of survivingUsers) {
    console.log(`  - User #${u.id}: "${u.username}" <${u.email}>`);
  }

  console.log(`\nBackup preserved at: ${backup.dumpPath}\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error("Fatal error:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
