"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

// Resets the job to QUEUED rather than generating inline here — the
// actual render happens on the next visit to /api/orders/[orderId]/pdf
// (by the admin via "Voir le PDF", or by the buyer from their account),
// same self-refreshing waiting-page flow either way.
export async function regeneratePdf(orderId: string) {
  const existing = await prisma.pdfJob.findFirst({ where: { orderId } });
  if (existing) {
    await prisma.pdfJob.update({ where: { id: existing.id }, data: { status: "QUEUED", attempts: 0, error: null } });
  } else {
    await prisma.pdfJob.create({ data: { orderId, status: "QUEUED" } });
  }
  revalidatePath("/admin/orders");
}
