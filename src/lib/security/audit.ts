import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

interface AuditEvent {
  eventType: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  severity?: "info" | "warning" | "error" | "critical";
}

export async function auditLog(event: AuditEvent): Promise<void> {
  try {
    const db = createAdminClient();
    await db.from("security_audit_log").insert({
      event_type: event.eventType,
      user_id: event.userId ?? null,
      ip_address: event.ip ?? null,
      user_agent: event.userAgent ?? null,
      resource_type: event.resourceType ?? null,
      resource_id: event.resourceId ?? null,
      details: event.details ?? {},
      severity: event.severity ?? "info",
    });
  } catch (error) {
    console.error("Audit log failed:", error);
  }
}
