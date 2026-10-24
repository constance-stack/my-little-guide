import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processQueuedPdfJob } from "@/lib/pdf";
import { exists } from "@/lib/storage";

/**
 * Generates an order's PDF on demand instead of relying on a separate
 * polling worker — Render's free tier has no Background Worker option
 * (they start at $7/mo, no free tier at all), and the Docker image
 * already ships Playwright for this exact purpose (the image is built
 * FROM mcr.microsoft.com/playwright).
 *
 * This also replaces the email step entirely: the buyer downloads from
 * their own account instead of clicking a link in an email, so there's
 * no email provider to configure for the pilot.
 *
 * Generation is never awaited inside the request: the free web service
 * also spins down after inactivity, so a cold start plus a multi-second
 * Playwright render in one HTTP request can run past Safari's (and
 * Cloudflare's) connection timeout, which surfaces to the buyer as "can't
 * connect to the server" for a PDF that's actually fine. Instead this
 * kicks generation off in the background (the container keeps running
 * after the response, unlike a serverless function) and returns a small
 * self-refreshing waiting page; once the file is ready, a later refresh
 * hits the fast path below and redirects straight to it.
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

  // A DONE job can still point at a file the container no longer has —
  // this filesystem has no persistent disk, so a redeploy since the PDF
  // was generated wipes it even though the job row still says DONE.
  // Treat that case the same as "not generated yet" instead of serving a
  // 404 for a purchase the buyer already paid for.
  const fileStillThere = job.status === "DONE" && job.storageKey ? await exists(job.storageKey) : false;

  if (job.status === "DONE" && fileStillThere) {
    return NextResponse.redirect(new URL(`/api/storage/${job.storageKey}`, request.url));
  }

  if (job.status === "FAILED" && job.attempts >= 3) {
    return waitingPage(
      "La génération du PDF a échoué plusieurs fois. Contactez-nous si ça persiste, ou réessayez plus tard.",
      false
    );
  }

  // Kick off generation without awaiting it — reset a stale DONE (file
  // missing) or a FAILED job back to QUEUED first since
  // processQueuedPdfJob() no-ops on anything other than QUEUED/FAILED.
  if (job.status === "DONE" || job.status === "FAILED") {
    job = await prisma.pdfJob.update({ where: { id: job.id }, data: { status: "QUEUED" } });
  }
  if (job.status === "QUEUED") {
    processQueuedPdfJob(job.id).catch(() => {
      // Errors are already recorded on the job row by processQueuedPdfJob
      // itself; nothing else to do with a rejection from a detached call.
    });
  }
  // job.status === "RUNNING" here means a previous poll already started
  // generation — just wait for it instead of starting a second one.

  return waitingPage("Votre PDF est en cours de préparation — cette page se rafraîchit automatiquement.", true);
}

function waitingPage(message: string, refresh: boolean): NextResponse {
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
${refresh ? '<meta http-equiv="refresh" content="4">' : ""}
<title>My Little Guide — PDF</title>
<style>
  body { font-family: Georgia, serif; background: #faf8f3; color: #2b2b2b; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; }
  main { max-width: 28rem; text-align: center; }
  p { line-height: 1.5; }
</style>
</head>
<body>
<main><p>${message}</p></main>
</body>
</html>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
