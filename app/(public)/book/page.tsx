import { getDefaultTenantSlug } from "@/lib/auth-db";
import { redirect } from "next/navigation";

export default function LegacyBookPage() {
  redirect(`/book/${getDefaultTenantSlug()}`);
}
