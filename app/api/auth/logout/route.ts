import { deleteSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function POST(): Promise<never> {
  await deleteSession();
  redirect("/login");
}
