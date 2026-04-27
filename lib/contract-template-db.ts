import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getTenantByIdIncludingInactive, getTenantSettings } from "@/lib/auth-db";
import { db } from "@/lib/db";
import { contractTemplates, generatedContracts } from "@/lib/db/schema";
import {
  createDefaultContractTemplateDocument,
  getContractTemplateDisplayName,
  listContractTemplatePlaceholders,
  sanitizeContractTemplateDocument,
  type ContractTemplateDocument,
} from "@/lib/contract-template-content";
import { ALL_LOCALES, isLocale, type Locale } from "@/lib/i18n-config";

export interface ContractTemplateRecord {
  id: string;
  language: Locale;
  name: string;
  draft: ContractTemplateDocument;
  published: ContractTemplateDocument | null;
  updatedAt: string;
  publishedAt: string | null;
}

export interface GeneratedContractRecord {
  id: string;
  reservationId: string;
  language: Locale;
  templateId: string | null;
  fileUrl: string;
  createdAt: string;
}

function serializeTemplateDocument(document: ContractTemplateDocument): string {
  return JSON.stringify(document);
}

function parseTemplateDocument(source: string | null | undefined, locale: Locale): ContractTemplateDocument {
  if (!source) return createDefaultContractTemplateDocument(locale);

  try {
    return sanitizeContractTemplateDocument(JSON.parse(source), locale);
  } catch {
    return createDefaultContractTemplateDocument(locale);
  }
}

function mapTemplateRow(row: typeof contractTemplates.$inferSelect): ContractTemplateRecord {
  const language = isLocale(row.language) ? row.language : "en";
  return {
    id: row.id,
    language,
    name: row.name,
    draft: parseTemplateDocument(row.draftContent, language),
    published: row.publishedContent ? parseTemplateDocument(row.publishedContent, language) : null,
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}

function mapGeneratedContractRow(row: typeof generatedContracts.$inferSelect): GeneratedContractRecord {
  return {
    id: row.id,
    reservationId: row.reservationId,
    language: isLocale(row.language) ? row.language : "en",
    templateId: row.templateId ?? null,
    fileUrl: row.fileUrl,
    createdAt: row.createdAt.toISOString(),
  };
}

async function ensureTemplateRow(tenantId: string, language: Locale) {
  const name = getContractTemplateDisplayName(language);
  const draftContent = serializeTemplateDocument(createDefaultContractTemplateDocument(language));

  await db.insert(contractTemplates).values({
    id: randomUUID(),
    tenantId,
    language,
    name,
    draftContent,
  }).onConflictDoNothing({
    target: [contractTemplates.tenantId, contractTemplates.language],
  });
}

export async function ensureContractTemplateScaffold(tenantId: string): Promise<void> {
  // Guard: skip the upsert work if all locale rows already exist.
  const existing = await db.select({ language: contractTemplates.language })
    .from(contractTemplates)
    .where(eq(contractTemplates.tenantId, tenantId));
  const missingLocales = ALL_LOCALES.filter((l) => !existing.some((r) => r.language === l));

  if (missingLocales.length > 0) {
    const [tenant] = await Promise.all([getTenantByIdIncludingInactive(tenantId)]);
    if (!tenant) throw new Error("Tenant not found");
    await Promise.all(missingLocales.map((language) => ensureTemplateRow(tenantId, language)));
  }

  // Auto-publish enabled languages that have no published content yet.
  const settings = await getTenantSettings(tenantId);
  const enabledLanguages = settings.contractLanguages;
  if (!enabledLanguages.length) return;

  await db.update(contractTemplates)
    .set({
      publishedContent: sql`COALESCE(${contractTemplates.publishedContent}, ${contractTemplates.draftContent})`,
      publishedAt: sql`COALESCE(${contractTemplates.publishedAt}, NOW())`,
    })
    .where(and(
      eq(contractTemplates.tenantId, tenantId),
      inArray(contractTemplates.language, enabledLanguages),
      sql`${contractTemplates.publishedContent} IS NULL`
    ));
}

export async function listContractTemplates(tenantId: string): Promise<ContractTemplateRecord[]> {
  await ensureContractTemplateScaffold(tenantId);
  const rows = await db.select()
    .from(contractTemplates)
    .where(eq(contractTemplates.tenantId, tenantId));

  return rows
    .map(mapTemplateRow)
    .sort((left, right) => ALL_LOCALES.indexOf(left.language) - ALL_LOCALES.indexOf(right.language));
}

export async function getContractTemplate(tenantId: string, language: Locale): Promise<ContractTemplateRecord | null> {
  await ensureContractTemplateScaffold(tenantId);
  const [row] = await db.select()
    .from(contractTemplates)
    .where(and(eq(contractTemplates.tenantId, tenantId), eq(contractTemplates.language, language)))
    .limit(1);

  return row ? mapTemplateRow(row) : null;
}

export async function updateContractTemplateDraft(
  tenantId: string,
  language: Locale,
  input: { name: string; draft: ContractTemplateDocument }
): Promise<ContractTemplateRecord> {
  const name = input.name.trim() || getContractTemplateDisplayName(language);
  const draft = sanitizeContractTemplateDocument(input.draft, language);

  await ensureTemplateRow(tenantId, language);

  const [row] = await db.update(contractTemplates)
    .set({
      name,
      draftContent: serializeTemplateDocument(draft),
      updatedAt: sql`NOW()`,
    })
    .where(and(eq(contractTemplates.tenantId, tenantId), eq(contractTemplates.language, language)))
    .returning();

  return mapTemplateRow(row);
}

export async function publishContractTemplate(tenantId: string, language: Locale): Promise<ContractTemplateRecord> {
  await ensureTemplateRow(tenantId, language);
  const [row] = await db.update(contractTemplates)
    .set({
      publishedContent: sql`${contractTemplates.draftContent}`,
      publishedAt: sql`NOW()`,
      updatedAt: sql`NOW()`,
    })
    .where(and(eq(contractTemplates.tenantId, tenantId), eq(contractTemplates.language, language)))
    .returning();

  return mapTemplateRow(row);
}

export async function getPublishedContractTemplate(tenantId: string, language: Locale): Promise<ContractTemplateRecord | null> {
  await ensureContractTemplateScaffold(tenantId);
  const [row] = await db.select()
    .from(contractTemplates)
    .where(and(
      eq(contractTemplates.tenantId, tenantId),
      eq(contractTemplates.language, language),
      sql`${contractTemplates.publishedContent} IS NOT NULL`
    ))
    .limit(1);

  return row ? mapTemplateRow(row) : null;
}

export async function getMissingPublishedContractLanguages(tenantId: string, languages: readonly Locale[]): Promise<Locale[]> {
  if (!languages.length) return [];
  await ensureContractTemplateScaffold(tenantId);
  const rows = await db.select({
    language: contractTemplates.language,
    publishedContent: contractTemplates.publishedContent,
  })
    .from(contractTemplates)
    .where(and(eq(contractTemplates.tenantId, tenantId), inArray(contractTemplates.language, [...languages])));

  const published = new Set(
    rows
      .filter((row) => row.publishedContent && isLocale(row.language))
      .map((row) => row.language as Locale)
  );

  return [...languages].filter((language) => !published.has(language));
}

export async function getGeneratedContract(tenantId: string, reservationId: string, language: Locale): Promise<GeneratedContractRecord | null> {
  const [row] = await db.select()
    .from(generatedContracts)
    .where(and(
      eq(generatedContracts.tenantId, tenantId),
      eq(generatedContracts.reservationId, reservationId),
      eq(generatedContracts.language, language)
    ))
    .limit(1);

  return row ? mapGeneratedContractRow(row) : null;
}

export async function saveGeneratedContractArchive(input: {
  tenantId: string;
  reservationId: string;
  language: Locale;
  templateId: string | null;
  fileUrl: string;
}): Promise<GeneratedContractRecord> {
  const [row] = await db.insert(generatedContracts).values({
    id: randomUUID(),
    tenantId: input.tenantId,
    reservationId: input.reservationId,
    language: input.language,
    templateId: input.templateId,
    fileUrl: input.fileUrl,
  }).onConflictDoUpdate({
    target: [generatedContracts.tenantId, generatedContracts.reservationId, generatedContracts.language],
    set: {
      templateId: input.templateId,
      fileUrl: input.fileUrl,
    },
  }).returning();

  return mapGeneratedContractRow(row);
}

export function getContractTemplatePlaceholderList() {
  return listContractTemplatePlaceholders();
}
