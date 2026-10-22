"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { put } from "@/lib/storage";

export async function uploadPhoto(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Aucun fichier sélectionné.");
  }

  const photographer = String(formData.get("photographer") ?? "");
  const sourceName = String(formData.get("sourceName") ?? "");
  const sourceUrl = String(formData.get("sourceUrl") ?? "");
  const licenseType = String(formData.get("licenseType") ?? "");
  const altText = String(formData.get("altText") ?? "");
  const commercialOk = formData.get("commercialOk") === "on";

  if (!photographer || !sourceName || !licenseType || !altText) {
    throw new Error("Les champs photographe, source, licence et texte alternatif sont obligatoires.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const key = `photos/${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await put(key, buffer);

  await prisma.photo.create({
    data: {
      storageKey: `/api/storage/${key}`,
      photographer,
      sourceName,
      sourceUrl,
      licenseType,
      altText,
      commercialOk,
      verifiedAt: commercialOk ? new Date() : null,
    },
  });

  revalidatePath("/admin/photos");
}
