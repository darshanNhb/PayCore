import nodemailer from "nodemailer";

/**
 * Email sending utility using nodemailer.
 * Uses SMTP credentials from environment variables.
 */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}) {
  const from = process.env.SMTP_FROM || "PayCore <no-reply@paycore.app>";

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
    attachments,
  });
}

/**
 * Send a password reset OTP email.
 */
export async function sendPasswordResetOTP(email: string, otp: string) {
  await sendEmail({
    to: email,
    subject: "PayCore — Password Reset Code",
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #6366f1, #7c3aed); color: #fff; font-weight: 700; font-size: 20px; line-height: 40px; text-align: center;">P</div>
          <h2 style="margin: 12px 0 0; font-size: 20px; color: #0f172a;">PayCore</h2>
        </div>
        
        <h1 style="font-size: 24px; font-weight: 600; color: #0f172a; text-align: center; margin-bottom: 8px;">Password Reset</h1>
        <p style="color: #64748b; text-align: center; font-size: 14px; margin-bottom: 32px;">
          Use the code below to reset your password. This code expires in 10 minutes.
        </p>
        
        <div style="background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #4f46e5;">${otp}</span>
        </div>
        
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
