"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

const TEXT_FIELDS = [
  "name",
  "vibeText",
  "prosText",
  "consText",
  "transportText",
  "nearbyText",
  "profileFitText",
  "hotelAdviceText",
  "mapColor",
] as const;

export async function updateZone(id: string, formData: FormData) {
  const data = Object.fromEntries(TEXT_FIELDS.map((field) => [field, String(formData.get(field) ?? "")]));

  await prisma.zone.update({ where: { id }, data });

  revalidatePath("/admin/zones");
  revalidatePath(`/admin/zones/${id}`);
  redirect("/admin/zones");
}
