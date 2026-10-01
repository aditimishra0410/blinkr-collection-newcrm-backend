import { Router } from "express";
import * as authController from "./auth.controller.js";
import { authenticate } from "../../middlewares/auth.js";
import { loginLimiter } from "../../middlewares/rateLimiter.js";
import { validate } from "../../middlewares/validate.js";
import { loginSchema } from "./auth.validation.js";

const router = Router();
router.post("/login", loginLimiter, validate(loginSchema), authController.login);
router.get("/profile", authenticate, authController.getProfile);
router.post("/logout", authenticate, authController.logout);

export default router;
