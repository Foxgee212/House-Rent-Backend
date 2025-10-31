import crypto from "crypto";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Generate a numeric OTP (default 6 digits)
 */
export function generateOTP(length = 6) {
  return crypto.randomInt(0, 10 ** length)
    .toString()
    .padStart(length, "0");
}

/**
 * Send OTP to user's email using Resend
 * @param {string} email - Recipient email
 * @param {string} otp - OTP code
 * @param {string} type - "verification" | "reset"
 */
export async function sendOTP(email, otp, type = "verification") {
  try {
    const subject = type === "verification"
      ? "✅ Verify Your HouseRent Account"
      : "🔐 Your HouseRent Password Reset Code";

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #2563eb;">HouseRent ${type === "verification" ? "Email Verification" : "Password Reset"}</h2>
        <p>Hello,</p>
        <p>Your one-time password (OTP) is:</p>
        <h3 style="background: #f1f5f9; color: #111; padding: 10px 15px; display: inline-block; border-radius: 6px;">
          ${otp}
        </h3>
        <p>This code will expire in <strong>10 minutes</strong>.</p>
        <p>If you did not request this, ignore this email.</p>
        <br />
        <p>— The HouseRent Team 🏠</p>
      </div>
    `;

    await resend.emails.send({
      from: "HouseRent <YOUR_VERIFIED_EMAIL@domain.com>", // must be verified
      to: email,
      subject,
      html,
    });

    console.log(`✅ OTP sent successfully to ${email}`);
  } catch (error) {
    console.error("❌ Error sending OTP:", error.message);
    throw new Error("Failed to send OTP email.");
  }
}
