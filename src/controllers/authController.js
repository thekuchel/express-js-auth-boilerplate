import prisma from "../config/db.js";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { generateAccessToken, generateRefreshToken, verifyToken, revokeRefreshToken, isRefreshTokenValid } from "../services/tokenService.js";
import { sendResetEmail } from "../utils/mail.js";
import crypto from "crypto";
import { add } from "date-fns";

export const register = async (req, res) => {
    try {
        const { email, password } = req.body;
        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists) return res.status(400).json({ message: "Email already exists" });

        const hashed = await hashPassword(password);
        const user = await prisma.user.create({ data: { email, password: hashed } });

        return res.status(201).json({ message: "User registered", user: { id: user.id, email: user.email } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const valid = await comparePassword(password, user.password);
        if (!valid) return res.status(400).json({ message: "Invalid credentials" });

        const accessToken = generateAccessToken({ id: user.id, role: user.role });
        const refreshToken = await generateRefreshToken(user);

        return res.json({ message: "Login success", accessToken, refreshToken });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ message: "No refresh token provided" });

        const valid = await isRefreshTokenValid(refreshToken);
        if (!valid) return res.status(401).json({ message: "Invalid refresh token" });

        // verify payload
        const payload = verifyToken(refreshToken);

        // issue new access token (optionally new refresh token)
        const accessToken = generateAccessToken({ id: payload.id, role: payload.role });

        return res.json({ accessToken });
    } catch (err) {
        return res.status(401).json({ message: "Invalid token", detail: err.message });
    }
};

export const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ message: "No refresh token provided" });

        await revokeRefreshToken(refreshToken);
        return res.json({ message: "Logged out" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/* Password reset flow:
  1) user requests reset -> create PasswordReset token, email link to user
  2) user clicks link with token -> POST new password with token -> verify token, update password, mark used
*/

export const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email required" });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(200).json({ message: "If the email exists, a reset link will be sent" }); // don't reveal

        // create token
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = add(new Date(), { hours: 1 }); // 1 hour expiry

        await prisma.passwordReset.create({
            data: {
                token,
                userId: user.id,
                expiresAt,
            },
        });

        // send email with link
        const resetLink = `${process.env.BASE_URL}/api/auth/reset-password?token=${token}`;
        await sendResetEmail(user.email, resetLink);

        return res.json({ message: "If the email exists, a reset link will be sent" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) return res.status(400).json({ message: "Token and new password required" });

        const reset = await prisma.passwordReset.findUnique({ where: { token } });
        if (!reset) return res.status(400).json({ message: "Invalid or expired token" });
        if (reset.used) return res.status(400).json({ message: "Token already used" });
        if (new Date(reset.expiresAt) < new Date()) return res.status(400).json({ message: "Token expired" });

        const hashed = await hashPassword(newPassword);
        await prisma.user.update({ where: { id: reset.userId }, data: { password: hashed } });

        await prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } });

        // optionally: revoke all refresh tokens for the user
        await prisma.refreshToken.updateMany({ where: { userId: reset.userId }, data: { revoked: true } });

        return res.json({ message: "Password has been reset" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
