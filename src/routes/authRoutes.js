import { Router } from "express";
import { register, login, refresh, logout, requestPasswordReset, resetPassword } from "../controllers/authController.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

// password reset
router.post("/request-reset", requestPasswordReset); // body: { email }
router.post("/reset-password", resetPassword); // body: { token, newPassword }

export default router;
