/**
 * Polls PdfJob/EmailJob for queued work. Deliberately a plain polling loop
 * rather than Redis/BullMQ — at this pilot's scale (one destination, low
 * order volume) a queue table is enough, and it's the first thing to swap
 * for a real queue if volume grows. Run with `npm run worker`.
 */
import { prisma } from "@/lib/db";
import { processQueuedPdfJob } from "@/lib/pdf";
import { processQueuedEmailJob } from "@/lib/email";

const POLL_INTERVAL_MS = 5000;

async function tick() {
  const pdfJobs = await prisma.pdfJob.findMany({ where: { status: "QUEUED" }, take: 5 });
  for (const job of pdfJobs) {
    console.log(`[worker] processing PdfJob ${job.id} (order ${job.orderId})`);
    await processQueuedPdfJob(job.id);
  }

  const emailJobs = await prisma.emailJob.findMany({ where: { status: "QUEUED" }, take: 5 });
  for (const job of emailJobs) {
    console.log(`[worker] processing EmailJob ${job.id} (order ${job.orderId})`);
    await processQueuedEmailJob(job.id);
  }
}

async function main() {
  console.log(`[worker] started, polling every ${POLL_INTERVAL_MS}ms`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await tick();
    } catch (error) {
      console.error("[worker] tick failed:", error);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

main();
