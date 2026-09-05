import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { setAuthCookies } from "@/lib/auth/session";
import { writeAuditLog, getClientIp, getClientUserAgent } from "@/lib/utils/audit";

const verifySchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json();
    const result = verifySchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    const { email, otp } = result.data;
    const redisKey = `signup:otp:${email}`;

    // Get from Redis
    const pendingDataStr = await redis.get<string | null>(redisKey);
    if (!pendingDataStr) {
      return NextResponse.json({ error: "OTP expired or invalid" }, { status: 400 });
    }

    // Parse data (Upstash redis returns object directly if it was a JSON string or depending on generic, but we stringified it)
    const pendingData = typeof pendingDataStr === "string" ? JSON.parse(pendingDataStr) : pendingDataStr;

    if (pendingData.otp !== otp) {
      return NextResponse.json({ error: "Incorrect OTP" }, { status: 400 });
    }

    // Clear OTP to prevent reuse
    await redis.del(redisKey);

    // Create User & Employee in a transaction
    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json({ error: "System not configured. Missing company." }, { status: 500 });
    }

    let dept = await prisma.department.findFirst({ where: { companyId: company.id } });
    if (!dept) {
      dept = await prisma.department.create({ data: { name: "General", companyId: company.id } });
    }
    let pos = await prisma.jobPosition.findFirst({ where: { companyId: company.id } });
    if (!pos) {
      pos = await prisma.jobPosition.create({ data: { title: "Team Member", companyId: company.id, departmentId: dept.id } });
    }

    const employeeCode = `EMP${Math.floor(1000 + Math.random() * 9000)}`;

    const { user, employee } = await prisma.$transaction(async (tx) => {
      // Create Employee
      const emp = await tx.employee.create({
        data: {
          firstName: pendingData.firstName,
          lastName: pendingData.lastName,
          workEmail: email,
          employeeCode,
          departmentId: dept.id,
          jobPositionId: pos.id,
          companyId: company.id,
          dateOfJoining: new Date(),
          status: "ACTIVE",
          avatarColor: "bg-emerald-100 text-emerald-700",
        },
      });

      // Create User
      const usr = await tx.user.create({
        data: {
          email,
          passwordHash: pendingData.passwordHash,
          firstName: pendingData.firstName,
          lastName: pendingData.lastName,
          role: "EMPLOYEE",
          employeeId: emp.id,
          isActive: true,
        },
      });

      return { user: usr, employee: emp };
    });

    await writeAuditLog({
      entityType: "User",
      entityId: user.id,
      action: "CREATE",
      ipAddress: ip,
      userAgent: getClientUserAgent(request),
      afterJson: { email, role: "EMPLOYEE" }
    });

    // Generate tokens
    const jtiAccess = crypto.randomUUID();
    const jtiRefresh = crypto.randomUUID();

    const accessToken = await signAccessToken({
      userId: user.id,
      role: user.role,
      employeeId: user.employeeId || undefined,
      jti: jtiAccess,
    });

    const refreshToken = await signRefreshToken({
      userId: user.id,
      jti: jtiRefresh,
    });

    // Hash refresh token for DB storage (revocation support)
    const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Update user last login and create refresh token record
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          createdByIp: ip,
        },
      }),
    ]);

    // Set cookies and return
    const response = NextResponse.json({ success: true, role: user.role });
    return setAuthCookies(response, accessToken, refreshToken);

  } catch (error: any) {
    console.error("[Verify OTP API Error]", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
