import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import houseRoutes from "./routes/houses.js";
import path from "path";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Serve uploaded images statically
app.use("/uploads", express.static(path.join(path.resolve(), "uploads")));

// Default route
app.get("/", (req, res) => {
  res.send("House Rent API is running...");
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/houses", houseRoutes);

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
