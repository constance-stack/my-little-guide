"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function regeneratePdf(orderId: string) {
  const existing = await prisma.pdfJob.findFirst({ where: { orderId } });
  if (existing) {
    await prisma.pdfJob.update({ where: { id: existing.id }, data: { status: "QUEUED", attempts: 0, error: null } });
  } else {
    await prisma.pdfJob.create({ data: { orderId, status: "QUEUED" } });
  }
  revalidatePath("/admin/orders");
}

export async function resendEmail(orderId: string) {
  const existing = await prisma.emailJob.findFirst({ where: { orderId } });
  if (existing) {
    await prisma.emailJob.update({ where: { id: existing.id }, data: { status: "QUEUED", attempts: 0, error: null } });
  } else {
    await prisma.emailJob.create({ data: { orderId, status: "QUEUED" } });
  }
  revalidatePath("/admin/orders");
}
