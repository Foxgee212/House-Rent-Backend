// config/mail.js
import nodemailer from "nodemailer";

// You can use Gmail or any SMTP service
export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",      // or your SMTP host
  port: 587,                   // or 465 for secure
  secure: false,               // true for 465, false for 587
  auth: {
    user: process.env.MAIL_USER, // your email
    pass: process.env.MAIL_PASS, // your email password or app password
  },
});

// Optional: verify connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.log("Mail config error:", error);
  } else {
    console.log("Mail server ready to send messages");
  }
});
