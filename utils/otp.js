import crypto from "crypto";
import { transporter } from "../config/mail.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Generate a numeric OTP (default: 6 digits)
 * Example: "482931"
 */
export function generateOTP(length = 6) {
  const max = 10 ** length;
  const otp = crypto.randomInt(0, max).toString().padStart(length, "0");
  return otp;
}

/**
 * Send OTP email for password reset
 * @param {string} email - User's email
 * @param {string} otp - OTP code
 */
export async function sendOTP(email, otp) {
  try {
    const mailOptions = {
      from: {
        name: "HouseRent Support",
        address: process.env.MAIL_USER,
      },
      to: email,
      subject: "🔐 Your Password Reset Code",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="color: #2563eb;">HouseRent Password Reset</h2>
          <p>Hello,</p>
          <p>Your one-time password (OTP) for resetting your account password is:</p>
          <h3 style="background: #f1f5f9; color: #111; padding: 10px 15px; display: inline-block; border-radius: 6px;">
            ${otp}
          </h3>
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          <p>If you did not request this, you can safely ignore this email.</p>
          <br />
          <p>— The HouseRent Security Team 🏠</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}`);
  } catch (error) {
    console.error("❌ Failed to send OTP email:", error.message);
    throw new Error("Could not send OTP email. Please try again later.");
  }
}
