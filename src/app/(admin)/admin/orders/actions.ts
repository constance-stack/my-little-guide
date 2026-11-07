"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

// Resets the job to QUEUED rather than generating inline here — the actual
// render happens on the next visit to /api/compte/pdf/[countryId] (by the
// admin via "Voir le PDF", or by the buyer from their account), same
// self-refreshing waiting-page flow either way. Scoped by (userId,
// countryId), not orderId — a country's PDF combines every destination
// that user owns there, possibly granted across several orders.
export async function regenerateCountryPdf(userId: string, countryId: string) {
  const existing = await prisma.countryPdfJob.findUnique({ where: { userId_countryId: { userId, countryId } } });
  if (existing) {
    await prisma.countryPdfJob.update({
      where: { id: existing.id },
      data: { status: "QUEUED", attempts: 0, error: null },
    });
  } else {
    await prisma.countryPdfJob.create({ data: { userId, countryId, status: "QUEUED" } });
  }
  revalidatePath("/admin/orders");
}
