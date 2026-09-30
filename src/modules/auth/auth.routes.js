import { Router } from "express";
import * as authController from "./auth.controller.js";
import { authenticate } from "../../middlewares/auth.js";
const router = Router();
router.post("/login", authController.login);
router.get("/profile", authenticate, authController.getProfile)
export default router;
