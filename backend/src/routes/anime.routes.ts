import { Router } from "express";
import {
  getSeasonEpisodes,
} from "../controllers/anime.controller.js";

const router = Router();

router.get(
  "/:animeId/seasons/:seasonNumber/episodes",
  getSeasonEpisodes
);

export default router;
