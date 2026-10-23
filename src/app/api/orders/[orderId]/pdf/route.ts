import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processQueuedPdfJob } from "@/lib/pdf";

/**
 * Generates an order's PDF on demand instead of relying on a separate
 * polling worker — Render's free tier has no Background Worker option
 * (they start at $7/mo, no free tier at all), and the Docker image
 * already ships Playwright for this exact purpose (the image is built
 * FROM mcr.microsoft.com/playwright). The first visit here after a
 * purchase takes a few seconds while the PDF renders; every visit after
 * that just redirects straight to the already-generated file.
 *
 * This also replaces the email step entirely: the buyer downloads from
 * their own account instead of clicking a link in an email, so there's
 * no email provider to configure for the pilot.
 */
export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL(`/connexion?callbackUrl=/compte`, request.url));
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  const isOwner = order?.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!order || (!isOwner && !isAdmin)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  let job = await prisma.pdfJob.findFirst({ where: { orderId }, orderBy: { createdAt: "desc" } });
  if (!job) {
    job = await prisma.pdfJob.create({ data: { orderId, status: "QUEUED" } });
  }

  if (job.status !== "DONE") {
    await processQueuedPdfJob(job.id);
    job = await prisma.pdfJob.findUniqueOrThrow({ where: { id: job.id } });
  }

  if (job.status !== "DONE" || !job.storageKey) {
    return NextResponse.json(
      { error: job.error ?? "La génération du PDF a échoué. Réessayez dans un instant." },
      { status: 502 }
    );
  }

  return NextResponse.redirect(new URL(`/api/storage/${job.storageKey}`, request.url));
}
