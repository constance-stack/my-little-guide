"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { PublishStatus } from "@/generated/prisma/enums";

export async function updateDestination(id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const status = String(formData.get("status") ?? "DRAFT") as PublishStatus;

  await prisma.destination.update({
    where: { id },
    data: { name, slug, status },
  });

  revalidatePath("/admin/destinations");
  revalidatePath(`/admin/destinations/${id}`);
  redirect("/admin/destinations");
}
