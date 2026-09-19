import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import favoritesRoutes from "./routes/favorites.routes.js";
import episodesRoutes from "./routes/episodes.routes.js";
import animeRoutes from "./routes/anime.routes.js";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://anime-catalog-wheat.vercel.app",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Request Logger
app.use((req, _res, next) => {
  console.log("--------------------------------------------------");
  console.log("🔥 REQUEST:", req.method, req.originalUrl);
  console.log("🌐 ORIGIN:", req.headers.origin);
  console.log("🍪 COOKIE:", req.headers.cookie ?? "NO COOKIE");
  console.log("--------------------------------------------------");

  next();
});

// Health Check
app.get("/", (_req, res) => {
  res.json({
    status: "OK",
    message: "AniMix Backend Running 🚀",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/episodes", episodesRoutes);
app.use("/api/anime", animeRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("❌ GLOBAL ERROR:", error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
);

export default app;