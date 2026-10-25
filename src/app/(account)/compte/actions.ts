"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Both actions require the current password, even for the admin's own
// account — a hijacked session cookie shouldn't be enough on its own to
// lock the real admin out by changing their login email or password.
async function requireCurrentPassword(userId: string, currentPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) throw new Error("Ce compte n'a pas encore de mot de passe défini.");
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new Error("Mot de passe actuel incorrect.");
  return user;
}

export async function updateAccountEmail(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Non connecté.");

  const newEmail = String(formData.get("newEmail") || "").trim().toLowerCase();
  const currentPassword = String(formData.get("currentPassword") || "");
  if (!newEmail || !currentPassword) throw new Error("Tous les champs sont obligatoires.");

  await requireCurrentPassword(session.user.id, currentPassword);

  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing && existing.id !== session.user.id) {
    throw new Error("Cet email est déjà utilisé par un autre compte.");
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { email: newEmail } });

  // The session cookie still points at the old email/id-bound token — force
  // a fresh sign-in so the new email actually takes effect everywhere.
  revalidatePath("/compte");
  await signOut({ redirectTo: "/connexion" });
}

export async function updateAccountPassword(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Non connecté.");

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const newPasswordConfirm = String(formData.get("newPasswordConfirm") || "");
  if (!currentPassword || !newPassword || !newPasswordConfirm) {
    throw new Error("Tous les champs sont obligatoires.");
  }
  if (newPassword.length < 8) {
    throw new Error("Le nouveau mot de passe doit faire au moins 8 caractères.");
  }
  if (newPassword !== newPasswordConfirm) {
    throw new Error("Les deux mots de passe ne correspondent pas.");
  }

  await requireCurrentPassword(session.user.id, currentPassword);

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: session.user.id }, data: { passwordHash } });

  revalidatePath("/compte");
  await signOut({ redirectTo: "/connexion" });
}
