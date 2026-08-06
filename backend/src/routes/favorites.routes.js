import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { addFavorite } from "../controllers/favorites.controller.js";

const router = express.Router();

router.post("/", authMiddleware, addFavorite);

export default router;