import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";

/**
 * Plain nodemailer over SMTP, same transport for every environment
 * (Mailpit locally, any real SMTP relay — Resend, Postmark, SES — in
 * production via env vars). One fewer external account needed for the
 * pilot than wiring a second, provider-specific SDK; swapping providers
 * later is an env var change, not a code change.
 */
function getTransport() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT),
    auth: process.env.EMAIL_SERVER_USER
      ? { user: process.env.EMAIL_SERVER_USER, pass: process.env.EMAIL_SERVER_PASSWORD }
      : undefined,
  });
}

export async function processQueuedEmailJob(jobId: string): Promise<void> {
  const job = await prisma.emailJob.findUnique({
    where: { id: jobId },
    include: { order: { include: { user: true, pdfJobs: true } } },
  });
  if (!job || job.status === "DONE") return;

  // The order confirmation email is only useful once the PDF is actually
  // ready to link to — leave it QUEUED (not failed) until that happens.
  const pdfJob = job.order.pdfJobs[0];
  if (!pdfJob || pdfJob.status !== "DONE") return;

  await prisma.emailJob.update({ where: { id: jobId }, data: { status: "RUNNING" } });

  try {
    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const transport = getTransport();
    await transport.sendMail({
      from: process.env.EMAIL_FROM,
      to: job.order.user.email,
      subject: "Votre guide My Little Guide est prêt",
      text: [
        "Votre commande est confirmée et votre guide personnalisé est prêt.",
        "",
        `Retrouvez votre PDF, votre guide interactif et votre carte privée dans votre espace : ${appUrl}/compte`,
        "",
        "— My Little Guide",
      ].join("\n"),
      html: `
        <div style="font-family: Georgia, serif; color: #3a4a3e; max-width: 480px;">
          <p style="text-transform: uppercase; letter-spacing: 0.2em; font-size: 11px; color: #4a7c59;">My Little Guide</p>
          <h1 style="font-size: 22px;">Votre guide est prêt</h1>
          <p>Votre commande est confirmée. Retrouvez votre PDF personnalisé, votre guide interactif et votre carte privée dans votre espace personnel.</p>
          <p><a href="${appUrl}/compte" style="display:inline-block; background:#4a7c59; color:#faf8f3; padding:10px 20px; text-decoration:none; border-radius:4px;">Accéder à mon espace</a></p>
        </div>
      `,
    });

    await prisma.emailJob.update({ where: { id: jobId }, data: { status: "DONE", error: null } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    const attempts = job.attempts + 1;
    await prisma.emailJob.update({
      where: { id: jobId },
      data: { status: attempts >= 3 ? "FAILED" : "QUEUED", attempts, error: message },
    });
  }
}
