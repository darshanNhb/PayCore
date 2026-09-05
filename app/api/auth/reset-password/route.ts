import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { z } from "zod";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * POST /api/auth/reset-password
 * Verifies OTP from Redis and updates the user's password.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp, newPassword } = schema.parse(body);
    const normalizedEmail = email.toLowerCase();

    // Get stored OTP from Redis
    const otpKey = `password_reset_otp:${normalizedEmail}`;
    const storedOtp = await redis.get(otpKey);

    if (!storedOtp || String(storedOtp) !== String(otp)) {
      return NextResponse.json(
        { error: "Invalid or expired code. Please try again." },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Hash new password and update
    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Delete the OTP from Redis (one-time use)
    await redis.del(otpKey);

    // Also clear rate limit
    await redis.del(`otp_rate:${normalizedEmail}`);

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. You can now sign in.",
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[Reset Password Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
