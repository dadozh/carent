#!/usr/bin/env node
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "../drizzle");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

await sql`
  CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
    id       serial PRIMARY KEY,
    hash     text NOT NULL UNIQUE,
    created_at bigint
  )
`;

const journal = JSON.parse(readFileSync(join(migrationsDir, "meta/_journal.json"), "utf8"));

for (const entry of journal.entries) {
  const [existing] = await sql`SELECT id FROM "__drizzle_migrations" WHERE hash = ${entry.tag}`;
  if (existing) {
    console.log(`Skip: ${entry.tag}`);
    continue;
  }

  const content = readFileSync(join(migrationsDir, `${entry.tag}.sql`), "utf8");
  const statements = content.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);

  for (const statement of statements) {
    await sql.unsafe(statement);
  }

  await sql`INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (${entry.tag}, ${Date.now()})`;
  console.log(`Applied: ${entry.tag}`);
}

console.log("Migrations complete");
await sql.end();
