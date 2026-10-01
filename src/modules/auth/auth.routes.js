import { Router } from "express";
import * as authController from "./auth.controller.js";
import { authenticate } from "../../middlewares/auth.js";

const router = Router();
router.post("/login", authController.login);
router.get("/profile", authenticate, authController.getProfile);
router.post("/logout", authenticate, authController.logout);
router.get(
  "/test-exec",
  authenticate,
  authorizeRoles("COLLECTION-EXECUTIVE"),
  (req, res) => {
    res.json({ success: true, message: "Admin allowed" });
  },
);
router.get("/test-admin", authenticate, authorizeRoles("ADMIN"), (req, res) => {
  res.json({ success: true, message: "Admin allowed" });
});
export default router;
