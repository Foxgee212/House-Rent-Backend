import express from "express";
import multer from "multer";
import "@tensorflow/tfjs";
import * as faceapi from "face-api.js";
import { Canvas, Image, ImageData, loadImage, createCanvas } from "canvas";
import sharp from "sharp";
import Tesseract from "tesseract.js";
import path from "path";
import fs from "fs";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";
import cloudinary from "../config/cloudinary.js";
import limitVerificationAttempts from "../middleware/limitVerificationAttempts.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Monkey-patch for face-api
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// ===============================
// Config
// ===============================
const MODEL_URL = path.join(process.cwd(), "models/face");
const ROUTE_TIMEOUT = 60000; // 2-minute safety net

// ===============================
// Load Face Models Once
// ===============================
async function loadFaceModels() {
  if (global.modelsLoaded) return;
  if (!fs.existsSync(MODEL_URL))
    throw new Error(`❌ Missing face model folder: ${MODEL_URL}`);

  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_URL),
  ]);
  global.modelsLoaded = true;
}

// ===============================
// Utility Helpers
// ===============================
const resizeImage = (buffer, width = 400) =>
  sharp(buffer)
    .resize(width)
    .jpeg({ quality: 90, brightness: 1.2 })
    .toBuffer();

const uploadToCloud = (buffer, folder = "verification_uploads") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) return reject(err);
      resolve(result.secure_url);
    });
    stream.end(buffer);
  });

function bufferToImage(buffer) {
  const base64 = buffer.toString("base64");
  return loadImage(`data:image/jpeg;base64,${base64}`);
}

async function extractOcrData(imageBuffer, idNumberFallback) {
  try {
    const { data } = await Tesseract.recognize(imageBuffer, "eng");
    const text = data.text || "";
    const name = text.match(/Name[:\s]+([A-Z ]+)/i)?.[1]?.trim() || "";
    const idNum = text.match(/ID[:\s]+([A-Z0-9]+)/i)?.[1]?.trim() || idNumberFallback;
    const dob = text.match(/(DATE OF BIRTH|Birth)[:\s]+([0-9\/\-]+)/i)?.[2]?.trim() || "";
    return { name, idNumber: idNum, dateOfBirth: dob, rawText: text };
  } catch (err) {
    console.warn("🧾 OCR failed:", err.message);
    return { name: "", idNumber: idNumberFallback, dateOfBirth: "", rawText: "" };
  }
}

async function recordAttempt(userId, success) {
  const user = await User.findById(userId);
  if (!user) return;
  user.verificationAttempts.count += 1;
  user.verificationAttempts.lastAttempt = new Date();
  if (!success && user.verificationAttempts.count >= 3)
    console.warn(`⚠️ User ${userId} has multiple failed attempts`);
  await user.save();
}

// ===============================
// POST /verification/auto
// ===============================
router.post(
  "/auto",
  auth,
  limitVerificationAttempts,
  upload.fields([{ name: "idImage" }, { name: "selfie" }]),
  async (req, res) => {
    res.setTimeout(ROUTE_TIMEOUT, () => {
      if (!res.headersSent)
        res.status(504).json({ msg: "Request timed out — try again later" });
    });

    try {
      const { idType, idNumber } = req.body;
      const idImage = req.files?.idImage?.[0];
      const selfie = req.files?.selfie?.[0];

      if (!idType || !idNumber || !idImage || !selfie)
        return res.status(400).json({ msg: "All fields and images are required" });


      const user = await User.findById(req.user.id);
      if(!user) return res.status(404).json({ msg: "User not found"})

        user.verification = {
          status: "pending",
          score: 0,
          idData: { idNumber},
          faceMatchDistance: null,
          idImageUrl: null,
          selfieUrl: null,
          createdAt: new Date(),
          reviewerNote: "Verification submitted, awaiting processing",
        };
        await user.save();

      //Respond immediately
      res.json({msg: "Verification submitted, pending outcome", verificationId: user._id})


      // ================================
      // Background Processing
      // ================================

          setImmediate(async () => {
        try {
          const [resizedId, resizedSelfie] = await Promise.all([
            resizeImage(idImage.buffer),
            resizeImage(selfie.buffer),
          ]);

          const ocrData = await extractOcrData(resizedId, idNumber);

          await loadFaceModels();

          const [idCanvas, selfieCanvas] = await Promise.all([
            bufferToImage(resizedId),
            bufferToImage(resizedSelfie),
          ]);

          const idDetection = await faceapi
            .detectSingleFace(idCanvas)
            .withFaceLandmarks()
            .withFaceDescriptor();

          const selfieDetection = await faceapi
            .detectSingleFace(selfieCanvas)
            .withFaceLandmarks()
            .withFaceDescriptor();

          let isMatch = false;
          let distance = null;
          let matchScore = 0;

          if (idDetection && selfieDetection) {
            distance = faceapi.euclideanDistance(idDetection.descriptor, selfieDetection.descriptor);
            matchScore = Math.max(0, Number(((1 - distance) * 100).toFixed(2)));
            isMatch = distance < 0.5;
          }

          const [idImageUrl, selfieUrl] = await Promise.all([
            uploadToCloud(resizedId),
            uploadToCloud(resizedSelfie),
          ]);

          // Update user with final outcome
          user.verification.status = isMatch ? "verified" : "pending";
          user.verification.score = matchScore;
          user.verification.faceMatchDistance = distance;
          user.verification.idData = ocrData;
          user.verification.idImageUrl = idImageUrl;
          user.verification.selfieUrl = selfieUrl;
          user.verification.reviewerNote = isMatch
            ? "Auto-verified by system"
            : "Pending admin review";

          await user.save();
          await recordAttempt(user._id, isMatch);
          console.log(`🔔 Background verification completed for user ${user.email}`);
        } catch (err) {
          console.error("💥 Background verification error:", err);
        }
      });
    } catch (err) {
      console.error("💥 Verification submission error:", err);
      res.status(500).json({ msg: "Server error during verification submission" });
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

  const user = await User.findById(id).select(
    "verified verification verificationAttempts"
  );
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    verified: user.verified,
    verification: user.verification,
    attempts: user.verificationAttempts,
  });
});

// ===============================
// PATCH /verification/:id/review  ✅ ADMIN ONLY
// ===============================
router.patch("/:id/review", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!["verified", "rejected", "pending_review"].includes(status)) {
      return res.status(400).json({
        msg: "Invalid status. Must be one of: verified, rejected, pending_review",
      });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.verified = status === "verified";
    user.verification.status = status;
    user.verification.reviewerNote =
      note || `Status changed to ${status} by admin`;
    user.verification.reviewedAt = new Date();

    await user.save();

    return res.json({
      msg: `✅ User verification ${status}`,
      userId: user._id,
      newStatus: status,
      reviewer: req.user.email,
    });
  } catch (err) {
    console.error("Admin review error:", err.message);
    res.status(500).json({ msg: "Server error during admin review" });
  }
});

export default router;
