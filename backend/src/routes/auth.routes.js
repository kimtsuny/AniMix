import { Router } from "express";
import {
  login,
  register,
  me,
} from "../controllers/auth.controller.js";

import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/login", login);
router.post("/register", register);

router.get("/me", authMiddleware, me);

export default router;