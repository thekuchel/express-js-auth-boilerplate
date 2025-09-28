import jwt from "jsonwebtoken";
import prisma from "../config/db.js";
import { add, isAfter } from "date-fns"; // optional helper date

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m";
const REFRESH_EXPIRES_DAYS = parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS || "7", 10);

export const generateAccessToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
};

export const generateRefreshToken = async (user) => {
    const payload = { id: user.id, role: user.role };
    // use long expiry in JWT so it self-expires, but we also persist with explicit date
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: `${REFRESH_EXPIRES_DAYS}d` });

    const expiresAt = add(new Date(), { days: REFRESH_EXPIRES_DAYS });

    await prisma.refreshToken.create({
        data: {
            token,
            userId: user.id,
            expiresAt,
        },
    });

    return token;
};

export const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

export const revokeRefreshToken = async (token) => {
    await prisma.refreshToken.updateMany({
        where: { token },
        data: { revoked: true },
    });
};

export const isRefreshTokenValid = async (token) => {
    const db = await prisma.refreshToken.findUnique({ where: { token } });
    if (!db) return false;
    if (db.revoked) return false;
    if (new Date(db.expiresAt) < new Date()) return false;
    return true;
};
