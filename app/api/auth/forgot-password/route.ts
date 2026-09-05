import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { Redis } from "@upstash/redis";
import { sendPasswordResetOTP } from "@/lib/email/mailer";

const redis = Redis.fromEnv();

const schema = z.object({
  email: z.string().email(),
});

/**
 * POST /api/auth/forgot-password
 * Sends a 6-digit OTP to the user's email. Stored in Redis with 10min TTL.
 * Always returns 200 to prevent email enumeration.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = schema.parse(body);
    const normalizedEmail = email.toLowerCase();

    // Always return 200 to prevent email enumeration
    const successResponse = NextResponse.json({
      success: true,
      message: "If an account exists with this email, a reset code has been sent.",
    });

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      return successResponse;
    }

    // Rate limit: max 3 OTPs per email per 10 minutes
    const rateLimitKey = `otp_rate:${normalizedEmail}`;
    const attempts = await redis.incr(rateLimitKey);
    if (attempts === 1) {
      await redis.expire(rateLimitKey, 600);
    }
    if (attempts > 3) {
      return successResponse; // Silently reject
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in Redis with 10 minute TTL
    const otpKey = `password_reset_otp:${normalizedEmail}`;
    await redis.set(otpKey, otp, { ex: 600 }); // 10 minutes

    // Send email
    try {
      await sendPasswordResetOTP(normalizedEmail, otp);
    } catch (emailError) {
      console.error("[Forgot Password] Email send failed:", emailError);
      // Still return success to prevent enumeration
    }

    return successResponse;
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }
    console.error("[Forgot Password Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
