"use client";

import { useState, useEffect, useCallback } from "react";
import { useCan } from "@/lib/role-context";
import { usePlanFeature } from "@/lib/plan-context";
import { useI18n } from "@/lib/i18n";
import { PLAN_LABELS } from "@/lib/plan-features";
import { usePlan } from "@/lib/plan-context";
import { type AuditEntityType } from "@/lib/audit-db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
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

interface AuditResponse {
  logs?: AuditLogEntry[];
  actors?: Array<{ userId: string; userName: string }>;
  total?: number;
  page?: number;
  pageSize?: number;
}

type StructuredAuditDetail = {
  summary?: string;
  subtitle?: string;
  metadata?: Array<{
    key: string;
    value: string;
  }>;
  note?: string;
  changes?: Array<{
    field: string;
    oldValue: string | number | null;
    newValue: string | number | null;
  }>;
};

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

function formatDateTimeValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})$/);
  if (!match) return value;
  return `${match[3]}.${match[2]}.${match[1]} ${match[4]}`;
}

function actionLabel(action: string) {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseAuditDetail(detail: string): StructuredAuditDetail | null {
  if (!detail.trim().startsWith("{")) return null;

  try {
    const parsed = JSON.parse(detail) as StructuredAuditDetail;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function fillTemplate(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce((result, [key, value]) => {
    return result.replaceAll(`{${key}}`, value);
  }, template);
}

export default function AuditLogPage() {
  const { t } = useI18n();
  const canAccess = useCan("manageSettings");
  const hasPlan = usePlanFeature("auditLog");
  const plan = usePlan();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [actors, setActors] = useState<Array<{ userId: string; userName: string }>>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const getEntityLabel = useCallback((entityType: AuditEntityType) => {
    return t(`audit.entityType.${entityType}`);
  }, [t]);

  const getActionLabel = useCallback((action: string) => {
    const translated = t(`audit.actionType.${action}`);
    return translated === `audit.actionType.${action}` ? actionLabel(action) : translated;
  }, [t]);

  const getVehicleFieldLabel = useCallback((field: string) => {
    const fieldMap: Record<string, string> = {
      make: t("audit.field.make"),
      model: t("audit.field.model"),
      trim: t("audit.field.trim"),
      year: t("audit.field.year"),
      category: t("audit.field.category"),
      fuelType: t("audit.field.fuelType"),
      transmission: t("audit.field.transmission"),
      seats: t("audit.field.seats"),
      luggageCount: t("audit.field.luggageCount"),
      color: t("audit.field.color"),
      plate: t("audit.field.plate"),
      vin: t("audit.field.vin"),
      mileage: t("audit.field.mileage"),
      dailyRate: t("audit.field.dailyRate"),
      location: t("audit.field.location"),
      status: t("audit.field.status"),
    };

    return fieldMap[field] ?? field;
  }, [t]);

  const formatVehicleFieldValue = useCallback((field: string, value: string | number | null) => {
    if (value === null || value === "") return t("audit.emptyValue");

    if (field === "status") {
      return t(`fleet.status.${value}`);
    }

    if (field === "category") {
      return t(`fleet.${value}`);
    }

    if (field === "fuelType") {
      const fuelMap: Record<string, string> = {
        Gasoline: "vehicleForm.fuel.gasoline",
        Diesel: "vehicleForm.fuel.diesel",
        Hybrid: "vehicleForm.fuel.hybrid",
        Electric: "vehicleForm.fuel.electric",
        LPG: "vehicleForm.fuel.lpg",
      };
      return typeof value === "string" ? t(fuelMap[value] ?? value) : String(value);
    }

    if (field === "transmission") {
      const transmissionMap: Record<string, string> = {
        Automatic: "vehicleForm.transmission.automatic",
        Manual: "vehicleForm.transmission.manual",
        CVT: "vehicleForm.transmission.cvt",
        "Semi-Auto": "vehicleForm.transmission.semiAuto",
      };
      return typeof value === "string" ? t(transmissionMap[value] ?? value) : String(value);
    }

    if (field === "location") {
      const locationMap: Record<string, string> = {
        Airport: "public.airport",
        Downtown: "public.downtown",
        Workshop: "vehicleForm.location.workshop",
        Storage: "vehicleForm.location.storage",
      };
      return typeof value === "string" ? t(locationMap[value] ?? value) : String(value);
    }

    if (field === "color") {
      const colorMap: Record<string, string> = {
        White: "vehicleForm.color.white",
        Black: "vehicleForm.color.black",
        Silver: "vehicleForm.color.silver",
        Gray: "vehicleForm.color.gray",
        Blue: "vehicleForm.color.blue",
        Red: "vehicleForm.color.red",
        Green: "vehicleForm.color.green",
        Yellow: "vehicleForm.color.yellow",
        Orange: "vehicleForm.color.orange",
        Brown: "vehicleForm.color.brown",
        Beige: "vehicleForm.color.beige",
        Gold: "vehicleForm.color.gold",
        Purple: "vehicleForm.color.purple",
        Other: "vehicleForm.color.other",
      };
      return typeof value === "string" ? t(colorMap[value] ?? value) : String(value);
    }

    if (field === "dailyRate") {
      return `€${value}`;
    }

    if (field === "mileage") {
      return `${value} km`;
    }

    return String(value);
  }, [t]);

  const getMetadataLabel = useCallback((key: string) => {
    const translated = t(`audit.meta.${key}`);
    return translated === `audit.meta.${key}` ? key : translated;
  }, [t]);

  const formatMetadataValue = useCallback((key: string, value: string) => {
    if (key === "reasonType") {
      const translated = t(`audit.metaValue.reasonType.${value}`);
      return translated === `audit.metaValue.reasonType.${value}` ? value : translated;
    }

    if (key === "period") {
      const [from, to] = value.split(" -> ");
      if (!from || !to) return value;
      return `${formatDateTimeValue(from)} -> ${formatDateTimeValue(to)}`;
    }

    if (key === "newReturnDate") {
      return formatDateTimeValue(value);
    }

    if (key === "fuelLevel") {
      const fuelKey = `res.fuel${value.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join("")}` as Parameters<typeof t>[0];
      return t(fuelKey);
    }

    if (key === "damageReported") {
      return value === "yes" ? t("common.yes") : t("common.no");
    }

    if (key === "paymentMethod") {
      const translated = t(`audit.metaValue.paymentMethod.${value}`);
      return translated === `audit.metaValue.paymentMethod.${value}` ? value : translated;
    }

    if (key === "paidAmount") {
      return `€${value}`;
    }

    if (key === "returnMileage") {
      return `${value} km`;
    }

    if (key === "status") {
      const translated = t(`res.status.${value}`);
      return translated === `res.status.${value}` ? value : translated;
    }

    return value;
  }, [t]);

  const fetchLogs = useCallback(async (type: string, selectedUserId: string, from: string, to: string, nextPage: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(pageSize),
      });
      if (type !== "all") {
        params.set("entityType", type);
      }
      if (selectedUserId !== "all") {
        params.set("userId", selectedUserId);
      }
      if (from) {
        params.set("dateFrom", from);
      }
      if (to) {
        params.set("dateTo", to);
      }
      const url = `/api/audit-logs?${params.toString()}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json() as AuditResponse;
        setLogs(data.logs ?? []);
        setActors(data.actors ?? []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    if (canAccess && hasPlan) fetchLogs(entityTypeFilter, userFilter, dateFrom, dateTo, page);
  }, [canAccess, hasPlan, entityTypeFilter, userFilter, dateFrom, dateTo, fetchLogs, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startEntry = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endEntry = total === 0 ? 0 : Math.min(page * pageSize, total);

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
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6" />
          {t("audit.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("audit.description")}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Select value={entityTypeFilter} onValueChange={(value) => {
          setEntityTypeFilter(value ?? "all");
          setPage(1);
        }}>
          <SelectTrigger className="w-full sm:w-44">
            <span>{entityTypeFilter === "all" ? t("audit.allTypes") : getEntityLabel(entityTypeFilter as AuditEntityType)}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("audit.allTypes")}</SelectItem>
            <SelectItem value="reservation">{getEntityLabel("reservation")}</SelectItem>
            <SelectItem value="vehicle">{getEntityLabel("vehicle")}</SelectItem>
            <SelectItem value="customer">{getEntityLabel("customer")}</SelectItem>
            <SelectItem value="user">{getEntityLabel("user")}</SelectItem>
            <SelectItem value="settings">{getEntityLabel("settings")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={userFilter} onValueChange={(value) => {
          setUserFilter(value ?? "all");
          setPage(1);
        }}>
          <SelectTrigger className="w-full sm:w-52">
            <span>{userFilter === "all" ? t("audit.allUsers") : actors.find((actor) => actor.userId === userFilter)?.userName ?? t("audit.allUsers")}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("audit.allUsers")}</SelectItem>
            {actors.map((actor) => (
              <SelectItem key={actor.userId} value={actor.userId}>{actor.userName}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={dateFrom}
          onChange={(event) => {
            setDateFrom(event.target.value);
            setPage(1);
          }}
          className="w-full sm:w-44"
          aria-label={t("audit.fromDate")}
        />

        <Input
          type="date"
          value={dateTo}
          onChange={(event) => {
            setDateTo(event.target.value);
            setPage(1);
          }}
          className="w-full sm:w-44"
          aria-label={t("audit.toDate")}
        />

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setEntityTypeFilter("all");
            setUserFilter("all");
            setDateFrom("");
            setDateTo("");
            setPage(1);
          }}
        >
          {t("common.clear")}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            {loading ? t("common.loading") : fillTemplate(t("audit.showingRange"), { start: String(startEntry), end: String(endEntry), total: String(total) })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!loading && logs.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">{t("audit.noEntries")}</p>
          ) : (
            <div className="divide-y">
              {logs.map((entry) => {
                const structuredDetail = parseAuditDetail(entry.detail);

                return (
                <div key={entry.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:w-36 sm:shrink-0">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="whitespace-nowrap">{formatAuditDate(entry.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs sm:w-36 sm:shrink-0">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{entry.userName}</span>
                    <span className="text-muted-foreground">({entry.userRole})</span>
                  </div>

                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${ENTITY_COLORS[entry.entityType] ?? ENTITY_COLORS.settings}`}
                    >
                      {getEntityLabel(entry.entityType)}
                    </span>
                      <span className="text-sm font-medium">{getActionLabel(entry.action)}</span>
                    </div>
                    {structuredDetail?.summary ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{structuredDetail.summary}</p>
                        <p className="text-xs text-muted-foreground">{structuredDetail.subtitle ?? `#${entry.entityId}`}</p>
                        {structuredDetail.metadata && structuredDetail.metadata.length > 0 ? (
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {structuredDetail.metadata.map((item, index) => (
                              <p key={`${entry.id}-${item.key}-${index}`}>
                                <span className="font-medium text-foreground">{getMetadataLabel(item.key)}:</span>{" "}
                                <span>{formatMetadataValue(item.key, item.value)}</span>
                              </p>
                            ))}
                          </div>
                        ) : null}
                        {structuredDetail.note ? (
                          <p className="text-sm text-muted-foreground">{structuredDetail.note}</p>
                        ) : null}
                        {structuredDetail.changes && structuredDetail.changes.length > 0 ? (
                          <div className="space-y-1 text-sm">
                            {structuredDetail.changes.map((change, index) => (
                              <p key={`${entry.id}-${change.field}-${index}`}>
                                <span className="font-medium">{getVehicleFieldLabel(change.field)}:</span>{" "}
                                <span className="text-muted-foreground">{formatVehicleFieldValue(change.field, change.oldValue)}</span>{" "}
                                <span aria-hidden="true">→</span>{" "}
                                <span>{formatVehicleFieldValue(change.field, change.newValue)}</span>
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : entry.detail ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">#{entry.entityId}</p>
                        <p className="text-sm text-muted-foreground">{entry.detail}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              )})}
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && total > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {fillTemplate(t("audit.pageStatus"), { page: String(page), totalPages: String(totalPages) })}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
              {t("audit.previousPage")}
            </Button>
            <Button variant="outline" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>
              {t("audit.nextPage")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
