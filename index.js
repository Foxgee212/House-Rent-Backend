import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { loadFaceModels } from "./utils/loadFaceModels.js";
import otpRoute from "./routes/Otp.js"
// ===== Route Imports =====
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import houseRoutes from "./routes/houses.js";
import profileRoutes from "./routes/profile.js";
import verificationRoutes from "./routes/verification.js";
import adminVerificationRoutes from "./routes/adminVerification.js"

dotenv.config();

// ===== Path Setup =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// ===== Security & Performance Middleware =====
app.use(helmet()); // Secure HTTP headers
app.use(compression()); // Gzip compression
app.use(express.json({ limit: "20mb" })); // Handle larger JSON bodies safely

// ===== Logging =====
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ===== Rate Limiting =====
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // Limit each IP
  message: { message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ===== CORS Setup =====
const allowedOrigins = [
  "http://localhost:5173",
  "https://house-rent-frontend-beta.vercel.app",
  "https://www.naijahome.ng",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// ===== Static Files =====
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===== Base Health Route =====
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "🏡 SkyRack House Rent API is running...",
    time: new Date().toISOString(),
  });
});

loadFaceModels().catch(err => {
  console.error("⚠️ Face model load failed:", err.message);
  process.exit(1);
});

// ===== Main Routes =====
app.use("/auth", authRoutes);
app.use("/houses", houseRoutes);
app.use("/profile", profileRoutes);
app.use("/admin", adminRoutes);
app.use("/verification", verificationRoutes);
app.use("/admin", adminVerificationRoutes);
app.use("/api", otpRoute)


// ===== Global Error Handler =====
app.use((err, req, res, next) => {
  console.error("❌ Global Error:", err);
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal server error",
  });
});

// ===== Database Connection =====
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

// ===== Start Server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
