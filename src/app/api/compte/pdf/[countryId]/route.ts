import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processQueuedCountryPdfJob } from "@/lib/pdf";
import { exists } from "@/lib/storage";

/**
 * Generates a (user, country) PDF on demand, same pattern as the former
 * per-order route (see git history) but keyed by country instead of a
 * single order — a customer's guide for a country combines every
 * destination they own there, possibly granted across several orders, so
 * there's exactly one downloadable PDF per country rather than one per
 * purchase.
 *
 * Generation is never awaited inside the request — see the former
 * per-order route's comment for why (Render free tier cold starts +
 * connection timeouts). Returns a small self-refreshing waiting page;
 * once the file is ready, a later refresh hits the fast path and
 * redirects straight to it.
 */
const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function GET(request: Request, { params }: { params: Promise<{ countryId: string }> }) {
  const { countryId } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL(`/connexion?callbackUrl=/compte`, appUrl));
  }

  const userId = session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isAdmin) {
    const ownsAnyDestinationHere = await prisma.entitlement.findFirst({
      where: { userId, destination: { countryId } },
    });
    if (!ownsAnyDestinationHere) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
    }
  }

  let job = await prisma.countryPdfJob.findUnique({ where: { userId_countryId: { userId, countryId } } });
  if (!job) {
    job = await prisma.countryPdfJob.create({ data: { userId, countryId, status: "QUEUED" } });
  }

  // A DONE job can still point at a file the container no longer has —
  // this filesystem has no persistent disk, so a redeploy since the PDF
  // was generated wipes it even though the job row still says DONE. Treat
  // that case the same as "not generated yet" instead of serving a 404 for
  // a purchase the buyer already paid for.
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

  // Kick off generation without awaiting it — reset a stale DONE (file
  // missing) or a FAILED job back to QUEUED first since
  // processQueuedCountryPdfJob() no-ops on anything other than
  // QUEUED/FAILED.
  if (job.status === "DONE" || job.status === "FAILED") {
    job = await prisma.countryPdfJob.update({ where: { id: job.id }, data: { status: "QUEUED" } });
  }
  if (job.status === "QUEUED") {
    processQueuedCountryPdfJob(job.id).catch(() => {
      // Errors are already recorded on the job row by
      // processQueuedCountryPdfJob itself; nothing else to do with a
      // rejection from a detached call.
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
