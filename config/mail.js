import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// ✅ Create a reusable transporter using SMTP
export const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "smtp.gmail.com", // default to Gmail
  port: process.env.MAIL_PORT || 587,
  secure: process.env.MAIL_PORT === "465", // true if using 465 (SSL)
  auth: {
    user: process.env.MAIL_USER, // your email address
    pass: process.env.MAIL_PASS, // app password or SMTP password
  },
});

// ✅ Optional: verify connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Mail configuration error:", error.message);
  } else {
    console.log("✅ Mail server ready to send messages");
  }
});
