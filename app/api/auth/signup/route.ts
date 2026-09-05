import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { sendOtpEmail } from "@/lib/mailer";
import crypto from "crypto";

const signupSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8), // Assuming min 8
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = signupSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data", details: result.error.format() }, { status: 400 });
    }

    const { firstName, lastName, email, password } = result.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Account with this email already exists" }, { status: 409 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the password now to store securely in Redis temporarily
    const { hashPassword } = await import("@/lib/auth/password");
    const passwordHash = await hashPassword(password);

    // Store in Redis (OTP + pending user data) with 15 minute expiration
    const redisKey = `signup:otp:${email}`;
    await redis.setex(redisKey, 15 * 60, JSON.stringify({
      otp, // Not hashing OTP for simplicity of this demo, since it's short lived and in Redis
      firstName,
      lastName,
      passwordHash,
    }));

    // Send the email
    await sendOtpEmail(email, otp);

    return NextResponse.json({ success: true, message: "OTP sent to email" });
  } catch (error: any) {
    console.error("[Signup API Error]", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
