import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generateOTP, sendOTP } from "../utils/otp.js";

// ==============================
// REGISTER USER
// ==============================
export const registerUser = async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const userExist = await User.findOne({ email });
    if (userExist)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashedPassword, role });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: { id: user._id, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// LOGIN USER (REQUEST OTP)
// ==============================
export const requestLoginOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otpCode = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = { code: otpCode, expiresAt: expires, purpose: "login" };
    await user.save();

    await sendOTP(email, otpCode);

    res.json({ message: "OTP sent to email" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// VERIFY LOGIN OTP
// ==============================
export const verifyLoginOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (
      !user ||
      !user.otp ||
      user.otp.purpose !== "login" ||
      user.otp.code !== otp ||
      user.otp.expiresAt < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Clear OTP
    user.otp = { code: "", expiresAt: null, purpose: "" };
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ message: "OTP verified", token, user: { email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// FORGOT PASSWORD OTP
// ==============================
export const requestForgotPasswordOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otpCode = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = { code: otpCode, expiresAt: expires, purpose: "reset" };
    await user.save();

    await sendOTP(email, otpCode);

    res.json({ message: "OTP sent to email for password reset" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==============================
// VERIFY FORGOT PASSWORD OTP
// ==============================
export const verifyForgotPasswordOtp = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (
      !user ||
      !user.otp ||
      user.otp.purpose !== "reset" ||
      user.otp.code !== otp ||
      user.otp.expiresAt < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (!newPassword) {
      return res.json({ message: "OTP verified, provide new password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = { code: "", expiresAt: null, purpose: "" };
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
