import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDb | undefined;

function getInstance(): DrizzleDb {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL environment variable is not set");
    _db = drizzle(postgres(url, { max: 10 }), { schema });
  }
  return _db;
}

export const db = new Proxy({} as DrizzleDb, {
  get(_, prop: string | symbol) {
    return getInstance()[prop as keyof DrizzleDb];
  },
});

export type Db = typeof db;
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
