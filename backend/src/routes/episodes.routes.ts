import { Router } from "express";
import {
  getEpisodeStream,
  getAnonymousEpisodeStream,
} from "../controllers/episodes.controller.js";

const router = Router();

router.get(
  "/anonymous/stream",
  getAnonymousEpisodeStream
);

router.get(
  "/:episodeId/stream",
  getEpisodeStream
);

export default router;