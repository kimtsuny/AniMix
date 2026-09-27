import { Router } from "express";
import {
  getMasterPlaylist,
  getVariantPlaylist,
  getKey,
  getSegment,
  getSubtitle,
} from "../controllers/stream-proxy.controller.js";

const router = Router();

router.get("/reanime/:sessionId/master.m3u8", getMasterPlaylist);
router.get("/reanime/:sessionId/variant", getVariantPlaylist);
router.get("/reanime/:sessionId/key", getKey);
router.get("/reanime/:sessionId/segment", getSegment);
router.get("/reanime/:sessionId/subtitles/:trackId", getSubtitle);
router.get("/reanime/:sessionId/subtitle", getSubtitle);

export default router;
