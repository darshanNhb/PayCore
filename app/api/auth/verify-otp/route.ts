import { NextResponse } from "next/server";
import { z } from "zod";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

/**
 * POST /api/auth/verify-otp
 * Verifies if the provided OTP matches the one in Redis for the given email.
 * This is used for early validation in the UI before resetting the password.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp } = schema.parse(body);
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

    return NextResponse.json({
      success: true,
      message: "OTP is valid",
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }
    console.error("[Verify OTP Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
