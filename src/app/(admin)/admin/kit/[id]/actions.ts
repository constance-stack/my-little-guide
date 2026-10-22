"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { PublishStatus } from "@/generated/prisma/enums";

export async function updateKitSection(id: string, formData: FormData) {
  const title = String(formData.get("title") ?? "");
  const content = String(formData.get("content") ?? "");
  const status = String(formData.get("status") ?? "DRAFT") as PublishStatus;

  await prisma.kitSection.update({ where: { id }, data: { title, content, status } });

  revalidatePath("/admin/kit");
  revalidatePath(`/admin/kit/${id}`);
  redirect("/admin/kit");
}
