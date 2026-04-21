export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { ensureDefaultTenant } = await import("@/lib/auth-db");
  await ensureDefaultTenant();
}
