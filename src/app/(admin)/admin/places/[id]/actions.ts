"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { put } from "@/lib/storage";
import type { PublishStatus } from "@/generated/prisma/enums";

// Uploads a photo and attaches it to this place in one step, so the admin
// doesn't have to go through /admin/photos first and then come back here
// to check a box — the two-step flow was the friction that prompted this.
export async function uploadPlacePhoto(placeId: string, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Aucun fichier sélectionné.");
  }

  const photographer = String(formData.get("photographer") || "").trim() || "Photo personnelle";
  const sourceName = String(formData.get("sourceName") || "").trim() || "Photo personnelle";
  const licenseType = String(formData.get("licenseType") || "").trim() || "Tous droits réservés — photo personnelle";
  const altText = String(formData.get("altText") || "").trim();
  const commercialOk = formData.get("commercialOk") === "on";

  if (!altText) {
    throw new Error("Le texte alternatif est obligatoire.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const key = `photos/${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await put(key, buffer);

  const photo = await prisma.photo.create({
    data: {
      storageKey: `/api/storage/${key}`,
      photographer,
      sourceName,
      sourceUrl: "",
      licenseType,
      altText,
      commercialOk,
      verifiedAt: commercialOk ? new Date() : null,
    },
  });

  const maxSortOrder = await prisma.placePhoto.aggregate({
    where: { placeId },
    _max: { sortOrder: true },
  });
  await prisma.placePhoto.create({
    data: { placeId, photoId: photo.id, sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1 },
  });

  revalidatePath(`/admin/places/${placeId}`);
  revalidatePath("/admin/photos");
}

export async function detachPlacePhoto(placeId: string, photoId: string) {
  await prisma.placePhoto.delete({ where: { placeId_photoId: { placeId, photoId } } });
  revalidatePath(`/admin/places/${placeId}`);
}

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
  const googlePlaceId = String(formData.get("googlePlaceId") || "").trim() || null;
  const isFictionalDemo = formData.get("isFictionalDemo") === "on";
  const categoryIds = formData.getAll("categoryIds").map(String);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Coordonnées GPS invalides.");
  }

  // Photos are managed separately (upload/detach forms below, acting
  // directly on PlacePhoto) so this save never touches them — it used to
  // read a giant "reuse an existing photo" checkbox list that became
  // unusable once the photo library grew past a handful of entries.
  if (status === "PUBLISHED") {
    const attachedPhotos = await prisma.placePhoto.findMany({ where: { placeId: id }, include: { photo: true } });
    if (attachedPhotos.length === 0 && !googlePlaceId) {
      throw new Error("Un lieu publié doit avoir au moins une photo ou un identifiant Google Places.");
    }
    if (attachedPhotos.some((p) => !p.photo.commercialOk)) {
      throw new Error("Impossible de publier : une photo attachée n'a pas d'usage commercial vérifié.");
    }
  }

  await prisma.place.update({
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
      googlePlaceId,
      isFictionalDemo,
      categories: { deleteMany: {}, create: categoryIds.map((categoryId) => ({ categoryId })) },
    },
  });

  revalidatePath("/admin/places");
  revalidatePath(`/admin/places/${id}`);
  redirect("/admin/places");
}
