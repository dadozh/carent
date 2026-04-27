export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.DATABASE_URL) {
    console.warn("[CARENT] Skipping default tenant seed because DATABASE_URL is not set.");
    return;
  }

  const { ensureDefaultTenant } = await import("@/lib/auth-db");
  await ensureDefaultTenant();
}
