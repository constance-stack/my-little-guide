"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { PublishStatus } from "@/generated/prisma/enums";

export async function updatePlace(id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const status = String(formData.get("status") ?? "DRAFT") as PublishStatus;
  const zoneId = String(formData.get("zoneId") || "") || null;
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const description = String(formData.get("description") ?? "");
  const whyVisit = String(formData.get("whyVisit") ?? "");
  const littleTip = String(formData.get("littleTip") || "") || null;
  const indicativePrice = String(formData.get("indicativePrice") || "") || null;
  const indicativeDuration = String(formData.get("indicativeDuration") || "") || null;
  const officialHours = String(formData.get("officialHours") || "") || null;
  const officialUrl = String(formData.get("officialUrl") || "") || null;
  const isFictionalDemo = formData.get("isFictionalDemo") === "on";
  const categoryIds = formData.getAll("categoryIds").map(String);
  const photoIds = formData.getAll("photoIds").map(String);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Coordonnées GPS invalides.");
  }

  if (status === "PUBLISHED") {
    if (photoIds.length === 0) {
      throw new Error("Un lieu publié doit avoir au moins une photo.");
    }
    const photos = await prisma.photo.findMany({ where: { id: { in: photoIds } } });
    if (photos.some((p) => !p.commercialOk)) {
      throw new Error("Impossible de publier : une photo attachée n'a pas d'usage commercial vérifié.");
    }
  }

  await prisma.$transaction([
    prisma.place.update({
      where: { id },
      data: {
        name,
        slug,
        status,
        zoneId,
        lat,
        lng,
        description,
        whyVisit,
        littleTip,
        indicativePrice,
        indicativeDuration,
        officialHours,
        officialUrl,
        isFictionalDemo,
        categories: { deleteMany: {}, create: categoryIds.map((categoryId) => ({ categoryId })) },
        photos: { deleteMany: {}, create: photoIds.map((photoId, i) => ({ photoId, sortOrder: i })) },
      },
    }),
  ]);

  revalidatePath("/admin/places");
  revalidatePath(`/admin/places/${id}`);
  redirect("/admin/places");
}
