import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { addFavorite, getFavorites, removeFavorite } from "../controllers/favorites.controller.js";

const router = express.Router();

router.post("/", authMiddleware, addFavorite);
router.get("/", authMiddleware, getFavorites);
router.delete("/:animeId", authMiddleware, removeFavorite);
export default router;