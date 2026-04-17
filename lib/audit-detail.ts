export interface AuditDetailPayload {
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
}

export function stringifyAuditDetail(detail: AuditDetailPayload): string {
  return JSON.stringify(detail);
}
