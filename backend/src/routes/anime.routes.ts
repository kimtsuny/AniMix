import { Router } from "express";
import {
  getSeasonEpisodes,
} from "../controllers/anime.controller.js";
import { optionalAuthMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/:animeId/seasons/:seasonNumber/episodes",
  optionalAuthMiddleware,
  getSeasonEpisodes
);

export default router;
