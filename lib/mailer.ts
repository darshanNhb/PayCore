import nodemailer from "nodemailer";

// Create reusable transporter object using the default SMTP transport
const createTransporter = () => {
  // If SMTP is not configured, we'll use a json transport that just logs for local dev
  if (!process.env.SMTP_HOST) {
    console.warn("SMTP_HOST not set, falling back to JSON transport (emails will be logged to console)");
    return nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465", 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

const transporter = createTransporter();

export const sendOtpEmail = async (to: string, otp: string) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || "PayCore <no-reply@paycore.app>",
    to,
    subject: "Your PayCore Signup Verification Code",
    text: `Welcome to PayCore!\n\nYour verification code is: ${otp}\n\nThis code will expire in 15 minutes.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to PayCore!</h2>
        <p>Your verification code is:</p>
        <h1 style="background: #f4f4f5; padding: 10px 20px; border-radius: 8px; letter-spacing: 5px; text-align: center;">${otp}</h1>
        <p>This code will expire in 15 minutes.</p>
        <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
  
  // If using json transport, log the content so the developer can see the OTP
  if (!process.env.SMTP_HOST) {
    console.log("========== EMAIL SENT ==========");
    console.log(`To: ${to}`);
    console.log(`OTP: ${otp}`);
    console.log("================================");
  }
  
  return info;
};
