"use client";

import { useSearchParams } from "next/navigation";
import { useCan } from "@/lib/role-context";
import { usePlanFeature } from "@/lib/plan-context";
import { useI18n } from "@/lib/i18n";
import { PLAN_LABELS } from "@/lib/plan-features";
import { usePlan } from "@/lib/plan-context";
import { ClipboardList } from "lucide-react";
import { AuditLogView } from "@/components/audit/audit-log-view";

export default function AuditLogPage() {
  const { t } = useI18n();
  const canAccess = useCan("manageSettings");
  const hasPlan = usePlanFeature("auditLog");
  const plan = usePlan();
  const searchParams = useSearchParams();
  const stream = searchParams.get("stream") === "admin" ? "admin" : "operations";

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied.</p>
      </div>
    );
  }

  if (!hasPlan) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <ClipboardList className="h-10 w-10 text-muted-foreground" />
        <p className="font-semibold">Audit Log is not available on the {PLAN_LABELS[plan] ?? plan} plan.</p>
        <p className="text-sm text-muted-foreground">Upgrade to Enterprise to access the immutable audit trail.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <AuditLogView
        endpoint="/api/audit-logs"
        title={stream === "admin" ? t("audit.adminTitle") : t("audit.operationsTitle")}
        description={stream === "admin" ? t("audit.adminDescription") : t("audit.operationsDescription")}
        category={stream}
        tabs={[
          { href: "/audit?stream=operations", label: t("audit.operationsTab"), active: stream === "operations" },
          { href: "/audit?stream=admin", label: t("audit.adminTab"), active: stream === "admin" },
        ]}
      />
    </div>
  );
}
