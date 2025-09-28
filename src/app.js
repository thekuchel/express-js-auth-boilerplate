import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import { authMiddleware } from "./middlewares/authMiddleware.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();
const app = express();
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.get("/", (req, res) => res.send("Auth API Boilerplate Running ✅"));

// example protected route
app.get("/api/protected", authMiddleware(["user", "admin"]), (req, res) => {
  res.json({ message: "protected ok", user: req.user });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
