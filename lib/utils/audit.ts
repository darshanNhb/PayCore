import { prisma } from "@/lib/db";
import { AuditAction } from "@prisma/client";

/**
 * Audit log helper — writes a structured audit trail entry.
 * Every write to financially or legally sensitive tables must call this.
 *
 * @see PayCore_Build_Prompt.md Section 3.1, 4.1
 */

interface AuditLogEntry {
  actorUserId?: string | null;
  entityType: string;
  entityId: string;
  action: AuditAction;
  beforeJson?: Record<string, unknown> | null;
  afterJson?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Write an audit log entry.
 * Call this inside transactions for critical operations.
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: entry.actorUserId ?? null,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        beforeJson: entry.beforeJson
          ? JSON.stringify(entry.beforeJson)
          : null,
        afterJson: entry.afterJson
          ? JSON.stringify(entry.afterJson)
          : null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      },
    });
  } catch (error) {
    // Audit log writes should never crash the main operation.
    // Log the error but don't throw.
    console.error("[AuditLog] Failed to write audit entry:", error);
  }
}

/**
 * Extract IP address from a Request object.
 * Handles X-Forwarded-For for proxied environments (Vercel).
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Extract user agent from a Request object.
 */
export function getClientUserAgent(request: Request): string {
  return request.headers.get("user-agent") || "unknown";
}
