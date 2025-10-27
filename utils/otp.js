import nodemailer from "nodemailer";
import crypto from "crypto";
import { transporter } from "../config/mail.js";

export function generateOTP(length = 6) {
  return crypto.randomInt(0, 10 ** length).toString().padStart(length, "0");
}

export async function sendOTP(email, otp) {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP code is: ${otp}. It expires in 10 minutes.`,
  });
}
