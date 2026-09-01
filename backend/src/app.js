import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import favoritesRoutes from "./routes/favorites.routes.js";

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

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "AniMix Backend Running 🚀",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/favorites", favoritesRoutes);

export default app;