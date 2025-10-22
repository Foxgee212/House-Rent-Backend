import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Import routes
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import houseRoutes from "./routes/houses.js";
import profileRoutes from "./routes/profile.js";

// Load environment variables
dotenv.config();

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ===== Middleware =====
app.use(express.json());

// ✅ CORS setup for both local dev and deployed frontend
const allowedOrigins = [
  "http://localhost:5173", // local frontend
  "https://house-rent-frontend-beta.vercel.app" // live frontend
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
}));

// ✅ Serve uploaded images statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===== Routes =====
app.get("/", (req, res) => {
  res.send("🏡 House Rent API is running...");
});

app.use("/auth", authRoutes);
app.use("/houses", houseRoutes);
app.use("/profile", profileRoutes);
app.use("/admin", adminRoutes);

// ===== Database Connection =====
mongoose
  .connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

// ===== Start Server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
