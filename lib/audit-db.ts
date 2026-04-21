import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { and, count as sqlCount, desc, eq, gte, lte, sql } from "drizzle-orm";

export type AuditEntityType = "reservation" | "vehicle" | "customer" | "user" | "settings" | "tenant" | "billing";
export type AuditCategory = "operations" | "admin";

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  userRole: string;
  category: AuditCategory;
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  detail: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export interface AuditLogActor {
  userId: string;
  userName: string;
}

type AuditLogInsert = Omit<AuditLogEntry, "id" | "createdAt" | "category"> & { category?: AuditCategory };

export function getAuditCategory(entityType: AuditEntityType): AuditCategory {
  switch (entityType) {
    case "reservation":
    case "vehicle":
    case "customer":
      return "operations";
    case "user":
    case "settings":
    case "tenant":
    case "billing":
      return "admin";
  }
}

export async function logAction(entry: AuditLogInsert): Promise<void> {
  try {
    const category = entry.category ?? getAuditCategory(entry.entityType);
    await db.insert(auditLogs).values({
      id: randomUUID(),
      tenantId: entry.tenantId,
      userId: entry.userId,
      userName: entry.userName,
      userRole: entry.userRole,
      category,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      detail: entry.detail,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    });
  } catch {
    // Audit logging must never break the main operation
  }
}

export async function listAuditLogs(
  tenantId: string,
  options: {
    entityType?: AuditEntityType;
    category?: AuditCategory;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<AuditLogEntry[]> {
  const { entityType, category, userId, dateFrom, dateTo, limit = 25, offset = 0 } = options;

  const conditions = [eq(auditLogs.tenantId, tenantId)];
  if (category) conditions.push(eq(auditLogs.category, category));
  if (entityType) conditions.push(eq(auditLogs.entityType, entityType));
  if (userId) conditions.push(eq(auditLogs.userId, userId));
  if (dateFrom) conditions.push(gte(sql`DATE(${auditLogs.createdAt})`, sql`DATE(${dateFrom})`));
  if (dateTo) conditions.push(lte(sql`DATE(${auditLogs.createdAt})`, sql`DATE(${dateTo})`));

  const rows = await db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(limit)
    .offset(offset);

  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    userName: row.userName,
    userRole: row.userRole,
    category: row.category as AuditCategory,
    entityType: row.entityType as AuditEntityType,
    entityId: row.entityId,
    action: row.action,
    detail: row.detail,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function countAuditLogsFiltered(
  tenantId: string,
  options: {
    entityType?: AuditEntityType;
    category?: AuditCategory;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}
): Promise<number> {
  const { entityType, category, userId, dateFrom, dateTo } = options;

  const conditions = [eq(auditLogs.tenantId, tenantId)];
  if (category) conditions.push(eq(auditLogs.category, category));
  if (entityType) conditions.push(eq(auditLogs.entityType, entityType));
  if (userId) conditions.push(eq(auditLogs.userId, userId));
  if (dateFrom) conditions.push(gte(sql`DATE(${auditLogs.createdAt})`, sql`DATE(${dateFrom})`));
  if (dateTo) conditions.push(lte(sql`DATE(${auditLogs.createdAt})`, sql`DATE(${dateTo})`));

  const [row] = await db
    .select({ total: sqlCount() })
    .from(auditLogs)
    .where(and(...conditions));

  return row?.total ?? 0;
}

export async function listAuditActors(tenantId: string): Promise<AuditLogActor[]> {
  const rows = await db.execute<{ user_id: string; user_name: string }>(sql`
    SELECT user_id, MAX(user_name) AS user_name
    FROM audit_logs
    WHERE tenant_id = ${tenantId}
    GROUP BY user_id
    ORDER BY MAX(created_at) DESC, MAX(user_name) ASC
  `);

  return rows.map((row) => ({ userId: row.user_id, userName: row.user_name }));
}
