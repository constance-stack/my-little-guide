"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function updatePrice(formData: FormData) {
  const id = String(formData.get("id"));
  const amountEuros = Number(formData.get("amountEuros"));
  const active = formData.get("active") === "on";

  if (!Number.isFinite(amountEuros) || amountEuros < 0) return;

  await prisma.price.update({
    where: { id },
    data: { amountCents: Math.round(amountEuros * 100), active },
  });

  revalidatePath("/admin/pricing");
}
