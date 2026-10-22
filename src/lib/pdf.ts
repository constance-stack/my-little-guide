import { chromium } from "playwright";
import { prisma } from "@/lib/db";
import { put } from "@/lib/storage";
import { createPdfToken } from "@/lib/pdf-token";

export async function renderOrderPdf(orderId: string): Promise<string> {
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const token = createPdfToken(orderId);
  const url = `${appUrl}/pdf/${orderId}?token=${token}`;

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

    const key = `pdfs/${orderId}.pdf`;
    await put(key, pdfBuffer);
    return key;
  } finally {
    await browser.close();
  }
}

export async function processQueuedPdfJob(jobId: string): Promise<void> {
  const job = await prisma.pdfJob.findUnique({ where: { id: jobId } });
  if (!job || job.status === "DONE") return;

  await prisma.pdfJob.update({ where: { id: jobId }, data: { status: "RUNNING" } });

  try {
    const storageKey = await renderOrderPdf(job.orderId);
    await prisma.pdfJob.update({
      where: { id: jobId },
      data: { status: "DONE", storageKey, error: null },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    const attempts = job.attempts + 1;
    await prisma.pdfJob.update({
      where: { id: jobId },
      data: {
        status: attempts >= 3 ? "FAILED" : "QUEUED",
        attempts,
        error: message,
      },
    });
  }
}
