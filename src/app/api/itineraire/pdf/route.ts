import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processQueuedItineraryPdfJob } from "@/lib/pdf";
import { exists } from "@/lib/storage";

// Same on-demand, non-blocking generation pattern as
// /api/favoris/pdf — see that route's comment for the full rationale
// (Render free tier has no background worker, and a cold start plus
// Playwright render in one request can exceed the buyer's browser's
// connection timeout). Keyed by the signed-in user instead of an order,
// since "my itinerary" isn't tied to any one purchase.
const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL(`/connexion?callbackUrl=/compte/itineraire`, appUrl));
  }
  const userId = session.user.id;

  let job = await prisma.itineraryPdfJob.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  if (!job) {
    job = await prisma.itineraryPdfJob.create({ data: { userId, status: "QUEUED" } });
  }

  const fileStillThere = job.status === "DONE" && job.storageKey ? await exists(job.storageKey) : false;

  if (job.status === "DONE" && fileStillThere) {
    return NextResponse.redirect(new URL(`/api/storage/${job.storageKey}`, appUrl));
  }

  if (job.status === "FAILED" && job.attempts >= 3) {
    return waitingPage(
      "La génération du PDF a échoué plusieurs fois. Contactez-nous si ça persiste, ou réessayez plus tard.",
      false
    );
  }

  if (job.status === "DONE" || job.status === "FAILED") {
    job = await prisma.itineraryPdfJob.update({ where: { id: job.id }, data: { status: "QUEUED" } });
  }
  if (job.status === "QUEUED") {
    processQueuedItineraryPdfJob(job.id).catch(() => {
      // Errors are already recorded on the job row by
      // processQueuedItineraryPdfJob itself.
    });
  }

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
