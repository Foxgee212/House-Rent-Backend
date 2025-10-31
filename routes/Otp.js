import express from "express";
import { generateOTP, sendOTP } from "../utils/otp.js";

const router = express.Router();

router.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  try {
    const otp = generateOTP(6);
    await sendOTP(email, otp);

    // For testing: just log OTP (in production, save to DB or cache)
    console.log("Generated OTP:", otp);

    res.json({ success: true, message: "OTP sent successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
