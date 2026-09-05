import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { hashPassword } from "@/lib/auth/password";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = resetPasswordSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const { token, password } = result.data;

    // Hash the raw token to find it in DB
    const tokenBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token)
    );
    const tokenHash = Array.from(new Uint8Array(tokenBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Find token in DB
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
      },
      include: { user: true },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset token." },
        { status: 400 }
      );
    }

    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Reset token has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const { user } = resetToken;
    const newPasswordHash = await hashPassword(password);

    // Transaction: update password, mark token used, revoke all existing sessions
    await prisma.$transaction([
      // Update password
      prisma.user.update({
        where: { id: user.id },
        data: { 
          passwordHash: newPasswordHash,
          mustChangePassword: false, 
        },
      }),
      // Mark token used
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Revoke ALL refresh tokens for this user
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    // Audit log
    await writeAuditLog({
      actorUserId: user.id,
      entityType: "User",
      entityId: user.id,
      action: "PASSWORD_RESET",
      ipAddress: getClientIp(request),
      userAgent: getClientUserAgent(request),
    });

    // NOTE: Access tokens will still be valid until their TTL expires (~15 min).
    // In a very strict system, we would broadcast a redis event to blacklist all current jtis for this user,
    // but typically letting the short TTL expire is acceptable when revoking all refresh tokens.

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("[Reset Password API Error]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
