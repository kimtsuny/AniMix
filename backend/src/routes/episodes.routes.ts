import { Router } from "express";
import {
  getEpisodeStream,
} from "../controllers/episodes.controller.js";

const router = Router();

router.get(
  "/:episodeId/stream",
  getEpisodeStream
);

export default router;