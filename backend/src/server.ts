import app from "./app.js";
import prisma from "./config/prisma.js";
import { env } from "./config/env.js";

async function startServer(): Promise<void> {
  try {
    await prisma.$connect();
    console.log("✅ Connected to PostgreSQL");

    app.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT}`);
    });
  } catch (error: unknown) {
    console.error("❌ Database connection failed");
    console.error(error);
  }
}

startServer();
