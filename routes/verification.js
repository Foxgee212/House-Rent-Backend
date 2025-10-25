import express from "express";
import multer from "multer";
import axios from "axios";
import * as faceapi from "face-api.js";
import canvas, { Canvas } from "canvas";
import Tesseract from "tesseract.js";
import fs from "fs";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import cloudinary from "../config/cloudinary.js";

const { Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ===============================
// POST /verification/auto
// Automated landlord verification
// ===============================
router.post(
  "/auto",
  auth,
  upload.fields([
    { name: "idImage", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { idType, idNumber, livenessPassed } = req.body;
      const idImage = req.files?.idImage?.[0];
      const selfie = req.files?.selfie?.[0];

      if (!idType || !idNumber || !idImage || !selfie) {
        return res.status(400).json({ msg: "All fields and images are required" });
      }

      // ===============================
      // Upload to Cloudinary
      // ===============================
      const uploadToCloud = (file, folder) =>
        new Promise((resolve, reject) => {
          if (!file?.buffer) return reject(new Error("Invalid file"));
          const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
            if (err) reject(err);
            else resolve(result.secure_url);
          });
          stream.end(file.buffer);
        });

      const [idImageUrl, selfieUrl] = await Promise.all([
        uploadToCloud(idImage, "verification_uploads"),
        uploadToCloud(selfie, "verification_uploads"),
      ]);

      // ===============================
      // Step 1: OCR Extraction (Tesseract)
      // ===============================
      const ocrResult = await Tesseract.recognize(idImage.buffer, "eng", {
        logger: (info) => console.log(info.status),
      });

      const rawText = ocrResult.data.text;
      const nameMatch = rawText.match(/Name[:\\s]+([A-Z ]+)/i);
      const idNumMatch = rawText.match(/ID[:\\s]+([A-Z0-9]+)/i);
      const dateMatch = rawText.match(/DOB[:\\s]+([0-9\/\-/]+)/i);

      const ocrData = {
        name: nameMatch?.[1]?.trim() || "",
        idNumber: idNumMatch?.[1]?.trim() || idNumber,
        dateOfBirth: dateMatch?.[1]?.trim() || "",
        rawText,
      };

      // ===============================
      // Step 2: Face Comparison
      // ===============================
      const faceCompare = await axios.post(
        "https://api.myidentitypass.com/api/v2/biometrics/face/compare",
        { image_one: idImageUrl, image_two: selfieUrl },
        { headers: { "x-api-key": process.env.IDENTITYPASS_KEY } }
      );

      const isMatch = faceCompare?.data?.data?.is_match || false;
      const matchScore = faceCompare?.data?.data?.match_score || 0;

      if (!isMatch) {
        await recordAttempt(req.user.id, false, "Face mismatch");
        return res.status(400).json({ msg: "❌ Face mismatch — verification failed" });
      }

      // ===============================
      // Step 3: Validate ID (IdentityPass)
      // ===============================
      const idCheck = await axios.post(
        "https://api.myidentitypass.com/api/v2/biometrics/merchant/validate-id",
        { idType, idNumber },
        { headers: { "x-api-key": process.env.IDENTITYPASS_KEY } }
      );

      const idValid = idCheck?.data?.success || false;

      // ===============================
      // Step 4: Prevent duplicate faces
      // ===============================
      const duplicate = await User.findOne({
        "verification.idData.idNumber": idNumber,
        _id: { $ne: req.user.id },
      });
      if (duplicate)
        return res.status(400).json({ msg: "This ID is already used for verification" });

      // ===============================
      // Step 5: Save Verification Result
      // ===============================
      const passed = idValid && isMatch && livenessPassed === "true";

      const user = await User.findById(req.user.id);
      user.verified = passed;
      user.verification = {
        status: passed ? "verified" : "pending",
        score: matchScore,
        idData: ocrData,
        livenessPassed: livenessPassed === "true",
        createdAt: new Date(),
      };

      user.verificationAttempts.count += 1;
      user.verificationAttempts.lastAttempt = new Date();

      await user.save();
      await recordAttempt(req.user.id, passed, passed ? "Verified" : "Failed");

      res.json({
        msg: passed ? "✅ Verification successful" : "❌ Verification failed",
        verified: passed,
        user,
      });
    } catch (error) {
      console.error("Verification error:", error.response?.data || error.message);
      res.status(500).json({ msg: "Server error during verification" });
    }
  }
);

// ===============================
// GET /verification/:id/status
// ===============================
router.get("/:id/status", auth, async (req, res) => {
  const { id } = req.params;
  if (req.user.id !== id && req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });

  const user = await User.findById(id).select("verified verification verificationAttempts");
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    verified: user.verified,
    verification: user.verification,
    attempts: user.verificationAttempts,
  });
});

// ===============================
// Helper: Record verification attempts
// ===============================
async function recordAttempt(userId, success, reason) {
  const user = await User.findById(userId);
  if (!user) return;

  const now = new Date();
  user.verificationAttempts.count += 1;
  user.verificationAttempts.lastAttempt = now;

  if (!success && user.verificationAttempts.count >= 3) {
    console.warn(`⚠️ User ${userId} has multiple failed attempts`);
  }

  await user.save();
}

export default router;
