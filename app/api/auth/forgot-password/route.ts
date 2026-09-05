import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { resetPasswordRateLimiter } from "@/lib/auth/rate-limit";
import { getClientIp } from "@/lib/utils/audit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    
    const { success } = await resetPasswordRateLimiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const result = forgotPasswordSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const { email } = result.data;
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json({ 
      success: true,
      message: "If an account exists with that email, a password reset link has been sent."
    });

    if (!user || !user.isActive) {
      return successResponse;
    }

    // 1. Generate token
    // We use a high-entropy random string (32 bytes)
    const rawToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // 2. Hash it for DB storage
    const tokenBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(rawToken)
    );
    const tokenHash = Array.from(new Uint8Array(tokenBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // 3. Store in DB (expires in 1 hour)
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }
    });

    // 4. Send email (Queue job via Upstash QStash)
    // NOTE: In Milestone 1, we just mock this.
    const resetUrl = `${process.env.APP_BASE_URL || "http://localhost:3000"}/reset-password?token=${rawToken}`;
    
    // In production, you would dispatch to QStash here.
    if (process.env.NODE_ENV === "development") {
      console.log(`\n======================================\n`);
      console.log(`[DEV] Password Reset Link for ${email}:`);
      console.log(resetUrl);
      console.log(`\n======================================\n`);
    }

    return successResponse;

  } catch (error) {
    console.error("[Forgot Password API Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
