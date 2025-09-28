import express from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { getMe } from "../controllers/userController.js";

const router = express.Router();
const prisma = new PrismaClient();
// protect all routes in this router
router.use(authMiddleware());

// GET /api/users/me
router.get("/me", getMe);

export default router;