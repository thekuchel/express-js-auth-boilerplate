import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getMe = async (req, res) => {
    try {
        // authMiddleware should set req.user. Try common id field.
        const userId = req.user?.id;
        if (!userId) {

            // If middleware already attached full user object, return it (but strip password)
            if (req.user && typeof req.user === "object") {
                const { password, ...safe } = req.user;
                return res.json({ data: safe });
            }
            return res.status(401).json({ error: "Unauthorized" });
        }

        const idNumber = Number(userId);
        const user = await prisma.user.findUnique({
            where: { id: idNumber },
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) return res.status(404).json({ error: "User not found" });
        return res.json({ data: user });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
};