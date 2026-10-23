"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { DestinationRequestStatus } from "@/generated/prisma/enums";

export async function createDestinationRequest(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Non autorisé.");

  const countryName = String(formData.get("countryName") ?? "").trim();
  const destinationName = String(formData.get("destinationName") ?? "").trim();
  const targetPlaceCountRaw = String(formData.get("targetPlaceCount") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!countryName || !destinationName) {
    throw new Error("Pays et destination sont obligatoires.");
  }

  await prisma.destinationRequest.create({
    data: {
      countryName,
      destinationName,
      targetPlaceCount: targetPlaceCountRaw ? Number(targetPlaceCountRaw) : null,
      notes,
      requestedById: session.user.id,
    },
  });

  revalidatePath("/admin/destinations/new");
  redirect("/admin/destinations/new");
}

export async function updateDestinationRequestStatus(id: string, status: DestinationRequestStatus) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Non autorisé.");

  await prisma.destinationRequest.update({
    where: { id },
    data: { status, completedAt: status === "DONE" ? new Date() : null },
  });

  revalidatePath("/admin/destinations/new");
}

export async function deleteDestinationRequest(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Non autorisé.");

  await prisma.destinationRequest.delete({ where: { id } });
  revalidatePath("/admin/destinations/new");
}
