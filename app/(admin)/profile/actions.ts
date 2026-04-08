"use server";

import { getUserById, updateUserPassword, verifyPassword } from "@/lib/auth-db";
import { verifySession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ChangePasswordState =
  | {
      error?: string;
      success?: string;
    }
  | undefined;

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const session = await verifySession();
  if (!session) redirect("/login");

  const currentPassword = `${formData.get("currentPassword") ?? ""}`;
  const newPassword = `${formData.get("newPassword") ?? ""}`;
  const confirmPassword = `${formData.get("confirmPassword") ?? ""}`;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "All password fields are required." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "New password and confirmation must match." };
  }

  if (newPassword === currentPassword) {
    return { error: "Choose a new password different from the current one." };
  }

  const user = getUserById(session.userId);
  if (!user) {
    redirect("/login");
  }

  if (!verifyPassword(currentPassword, user.password_hash)) {
    return { error: "Current password is incorrect." };
  }

  try {
    updateUserPassword(user.id, newPassword);
    revalidatePath("/profile");
    return { success: "Password updated successfully." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to update password",
    };
  }
}
