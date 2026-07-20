import app from "./app.js";
import prisma from "./config/prisma.js";

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log("✅ Connected to PostgreSQL");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Database connection failed");
    console.error(error);
  }
}

startServer();