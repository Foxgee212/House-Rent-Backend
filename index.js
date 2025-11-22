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
import otpRoute from "./routes/Otp.js";

// ===== Route Imports =====
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import rentalRoutes from "./routes/rentals.js"
import salesRoutes from "./routes/sales.js"
import profileRoutes from "./routes/profile.js";
import verificationRoutes from "./routes/verification.js";
import adminVerificationRoutes from "./routes/adminVerification.js";
import { cleanupUnverifiedUsers } from "./utils/cleanup.js";

dotenv.config();

// ===== Path Setup =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// ===== Security & Performance Middleware =====
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "20mb" }));

// ===== Logging =====
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ===== Rate Limiting =====
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100,
  message: { message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ===== CORS Configuration =====
const allowedOrigins = [
  "http://localhost:5173",
  "https://house-rent-frontend-beta.vercel.app",
  "https://naijahome.ng",
  "https://www.naijahome.ng",
  "http://localhost:3000",
  "https://naijahome-next-poyr1i7qc-foxgee212s-projects.vercel.app",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("❌ Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
};

app.use(cors(corsOptions));

// ===== Handle Preflight Requests =====
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Accept"
    );
    return res.sendStatus(204);
  }
  next();
});

// ===== Static Files =====
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===== Base Route =====
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "🏡 SkyRack House Rent API is running...",
    time: new Date().toISOString(),
  });
});

// ===== Load Face Models =====
loadFaceModels().catch((err) => {
  console.error("⚠️ Failed to load face models:", err.message);
  process.exit(1);
});

// ===== API Routes =====
app.use("/auth", authRoutes);
app.use("/rentals", rentalRoutes);
app.use("/sales", salesRoutes)
app.use("/profile", profileRoutes);
app.use("/admin", adminRoutes);
app.use("/verification", verificationRoutes);
app.use("/adminVer", adminVerificationRoutes);
app.use("/api", otpRoute);

// ===== Global 404 =====
app.use((req, res) => {
  res.status(404).json({ status: "error", message: "Route not found" });
});

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
  .then(() => {
    console.log("✅ MongoDB connected successfully");

    // Run cleanup immediately and every 6 hours
    cleanupUnverifiedUsers();
    setInterval(cleanupUnverifiedUsers, 2 * 60 * 60 * 1000);
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

// ===== Start Server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
