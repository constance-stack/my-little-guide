import { chromium } from "playwright";
import { prisma } from "@/lib/db";
import { put } from "@/lib/storage";
import { createPdfToken } from "@/lib/pdf-token";
import { resolvePageNumbers } from "@/lib/pdf-toc";

const PDF_OPTIONS = {
  format: "A4" as const,
  printBackground: true,
  margin: { top: "20mm", bottom: "20mm", left: "0mm", right: "0mm" },
  displayHeaderFooter: true,
  headerTemplate: "<div></div>",
  footerTemplate: `
    <div style="font-size:9px; width:100%; text-align:center; color:#8a7a63; font-family:Georgia,serif;">
      My Little Guide — <span class="pageNumber"></span> / <span class="totalPages"></span>
    </div>
  `,
};

/**
 * One PDF per (user, country) — not per order. A customer who owns several
 * destinations in the same country, whether bought in one checkout or
 * across several orders over time, gets a single combined PDF covering
 * every destination they own there plus that country's kit essentiel.
 * Regenerating it (see processQueuedCountryPdfJob) after a new purchase in
 * an already-owned country is what makes the new destination "join" the
 * existing PDF instead of producing a separate, incomplete one.
 *
 * Rendered in two passes so the "Sommaire" can show real page numbers.
 * Chromium's print engine has no CSS way for the HTML to know what page it
 * will land on (no target-counter() support), so the first pass renders
 * without numbers purely to find out where each destination/zone/kit
 * section actually falls, reads that back out of the PDF's own named
 * destinations via pdfjs-dist, then the second pass re-renders the exact
 * same content with those numbers now supplied — only this second buffer
 * is kept.
 */
export async function renderCountryPdf(userId: string, countryId: string): Promise<string> {
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const subject = `pays-${userId}-${countryId}`;
  const token = createPdfToken(subject);
  const baseUrl = `${appUrl}/pdf/pays/${userId}/${countryId}?token=${token}`;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();

    const draftResponse = await page.goto(baseUrl, { waitUntil: "networkidle" });
    if (!draftResponse || !draftResponse.ok()) {
      throw new Error(`PDF source route returned ${draftResponse?.status()}`);
    }
    const anchorIds = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[id]"))
        .map((el) => el.id)
        .filter((id) => id === "kit-essentiel" || id.startsWith("destination-") || id.startsWith("zone-"))
    );
    const draftPdf = await page.pdf(PDF_OPTIONS);
    const pageNumbers = await resolvePageNumbers(draftPdf, anchorIds);

    const finalUrl = `${baseUrl}&pageNumbers=${encodeURIComponent(JSON.stringify(pageNumbers))}`;
    const finalResponse = await page.goto(finalUrl, { waitUntil: "networkidle" });
    if (!finalResponse || !finalResponse.ok()) {
      throw new Error(`PDF source route returned ${finalResponse?.status()}`);
    }
    const pdfBuffer = await page.pdf(PDF_OPTIONS);

    const key = `pdfs/pays-${userId}-${countryId}.pdf`;
    await put(key, pdfBuffer);
    return key;
  } finally {
    await browser.close();
  }
}

export async function renderFavoritesPdf(userId: string): Promise<string> {
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const token = createPdfToken(`favoris-${userId}`);
  const url = `${appUrl}/pdf/favoris/${userId}?token=${token}`;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const response = await page.goto(url, { waitUntil: "networkidle" });
    if (!response || !response.ok()) {
      throw new Error(`PDF source route returned ${response?.status()}`);
    }

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "0mm", right: "0mm" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `
        <div style="font-size:9px; width:100%; text-align:center; color:#8a7a63; font-family:Georgia,serif;">
          My Little Guide — <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      `,
    });

    const key = `pdfs/favoris-${userId}.pdf`;
    await put(key, pdfBuffer);
    return key;
  } finally {
    await browser.close();
  }
}

export async function renderItineraryPdf(userId: string): Promise<string> {
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const token = createPdfToken(`itineraire-${userId}`);
  const url = `${appUrl}/pdf/itineraire/${userId}?token=${token}`;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const response = await page.goto(url, { waitUntil: "networkidle" });
    if (!response || !response.ok()) {
      throw new Error(`PDF source route returned ${response?.status()}`);
    }

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "0mm", right: "0mm" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `
        <div style="font-size:9px; width:100%; text-align:center; color:#8a7a63; font-family:Georgia,serif;">
          My Little Guide — <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      `,
    });

    const key = `pdfs/itineraire-${userId}.pdf`;
    await put(key, pdfBuffer);
    return key;
  } finally {
    await browser.close();
  }
}

export async function processQueuedItineraryPdfJob(jobId: string): Promise<void> {
  const job = await prisma.itineraryPdfJob.findUnique({ where: { id: jobId } });
  if (!job || job.status === "DONE") return;

  await prisma.itineraryPdfJob.update({ where: { id: jobId }, data: { status: "RUNNING" } });

  try {
    const storageKey = await renderItineraryPdf(job.userId);
    await prisma.itineraryPdfJob.update({
      where: { id: jobId },
      data: { status: "DONE", storageKey, error: null },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    const attempts = job.attempts + 1;
    await prisma.itineraryPdfJob.update({
      where: { id: jobId },
      data: {
        status: attempts >= 3 ? "FAILED" : "QUEUED",
        attempts,
        error: message,
      },
    });
  }
}

export async function processQueuedFavoritesPdfJob(jobId: string): Promise<void> {
  const job = await prisma.favoritesPdfJob.findUnique({ where: { id: jobId } });
  if (!job || job.status === "DONE") return;

  await prisma.favoritesPdfJob.update({ where: { id: jobId }, data: { status: "RUNNING" } });

  try {
    const storageKey = await renderFavoritesPdf(job.userId);
    await prisma.favoritesPdfJob.update({
      where: { id: jobId },
      data: { status: "DONE", storageKey, error: null },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    const attempts = job.attempts + 1;
    await prisma.favoritesPdfJob.update({
      where: { id: jobId },
      data: {
        status: attempts >= 3 ? "FAILED" : "QUEUED",
        attempts,
        error: message,
      },
    });
  }
}

export async function processQueuedCountryPdfJob(jobId: string): Promise<void> {
  const job = await prisma.countryPdfJob.findUnique({ where: { id: jobId } });
  if (!job || job.status === "DONE") return;

  await prisma.countryPdfJob.update({ where: { id: jobId }, data: { status: "RUNNING" } });

  try {
    const storageKey = await renderCountryPdf(job.userId, job.countryId);
    await prisma.countryPdfJob.update({
      where: { id: jobId },
      data: { status: "DONE", storageKey, error: null },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    const attempts = job.attempts + 1;
    await prisma.countryPdfJob.update({
      where: { id: jobId },
      data: {
        status: attempts >= 3 ? "FAILED" : "QUEUED",
        attempts,
        error: message,
      },
    });
  }
}
