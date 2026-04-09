"use client";

import { useState, useEffect, useCallback } from "react";
import { useCan } from "@/lib/role-context";
import { useI18n } from "@/lib/i18n";
import { type AuditEntityType } from "@/lib/audit-db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, User, Calendar } from "lucide-react";

interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  userRole: string;
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  detail: string;
  createdAt: string;
}

const ENTITY_COLORS: Record<string, string> = {
  reservation: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  vehicle: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  customer: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  user: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  settings: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

function formatAuditDate(iso: string) {
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
  } catch {
    return iso;
  }
}

function actionLabel(action: string) {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AuditLogPage() {
  const { t } = useI18n();
  const canAccess = useCan("manageSettings");

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");

  const fetchLogs = useCallback(async (type: string) => {
    setLoading(true);
    try {
      const url = type === "all" ? "/api/audit-logs" : `/api/audit-logs?entityType=${type}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canAccess) fetchLogs(entityTypeFilter);
  }, [canAccess, entityTypeFilter, fetchLogs]);

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6" />
          {t("audit.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("audit.description")}</p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("audit.filterType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("audit.allTypes")}</SelectItem>
            <SelectItem value="reservation">Reservation</SelectItem>
            <SelectItem value="vehicle">Vehicle</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="settings">Settings</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            {loading ? t("common.loading") : `${logs.length} entries`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!loading && logs.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">{t("audit.noEntries")}</p>
          ) : (
            <div className="divide-y">
              {logs.map((entry) => (
                <div key={entry.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
                  {/* Timestamp */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:w-36 sm:shrink-0">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="whitespace-nowrap">{formatAuditDate(entry.createdAt)}</span>
                  </div>

                  {/* Actor */}
                  <div className="flex items-center gap-1.5 text-xs sm:w-36 sm:shrink-0">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{entry.userName}</span>
                    <span className="text-muted-foreground">({entry.userRole})</span>
                  </div>

                  {/* Entity badge + action */}
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${ENTITY_COLORS[entry.entityType] ?? ENTITY_COLORS.settings}`}
                    >
                      {entry.entityType}
                    </span>
                    <span className="text-sm font-medium">{actionLabel(entry.action)}</span>
                    {entry.detail && (
                      <span className="text-sm text-muted-foreground">— {entry.detail}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
