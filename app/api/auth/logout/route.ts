import { stringifyAuditDetail } from "@/lib/audit-detail";
import { logAction } from "@/lib/audit-db";
import { getAuditRequestContext } from "@/lib/audit-request";
import { deleteSession, verifySession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function POST(): Promise<never> {
  const session = await verifySession();
  if (session) {
    const requestContext = await getAuditRequestContext();
    void logAction({
      tenantId: session.tenantId,
      userId: session.userId,
      userName: session.name,
      userRole: session.role,
      entityType: "user",
      entityId: session.userId,
      action: "signed_out",
      detail: stringifyAuditDetail({
        summary: session.name,
        subtitle: `#${session.userId}`,
        metadata: [{ key: "email", value: session.email }],
      }),
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });
  }
  await deleteSession();
  redirect("/login");
}
