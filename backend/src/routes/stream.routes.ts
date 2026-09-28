import { Router } from "express";
import {
  getMasterPlaylist,
  getVariantPlaylist,
  getKey,
  getSegment,
  getSubtitle,
} from "../controllers/stream-proxy.controller.js";

const router = Router();

router.get("/anikoto/:sessionId/master.m3u8", getMasterPlaylist);
router.get("/anikoto/:sessionId/variant", getVariantPlaylist);
router.get("/anikoto/:sessionId/key", getKey);
router.get("/anikoto/:sessionId/segment", getSegment);
router.get("/anikoto/:sessionId/subtitles/:trackId", getSubtitle);
router.get("/anikoto/:sessionId/subtitle", getSubtitle);

export default router;
