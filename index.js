import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import houseRoutes from "./routes/houses.js";
import profileRoutes from "./routes/profile.js";

// Load environment variables

dotenv.config();

const app = express();

// Fix __dirname / __filename in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Middleware =====
app.use(express.json());

// ✅ Dynamic CORS (works locally & when deployed)
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// ✅ Serve uploaded images statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===== Routes =====
app.get("/", (req, res) => {
  res.send("🏡 House Rent API is running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/houses", houseRoutes);
app.use("/api/profile", profileRoutes); // Dynamic import for ES module

// ===== Database Connection =====
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

// ===== Start Server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
