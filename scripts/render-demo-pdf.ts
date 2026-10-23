/**
 * Renders /pdf/demo (see src/app/(pdf)/pdf/demo/page.tsx) to a static
 * file at public/demo/bangkok-apercu.pdf — a public marketing asset, not
 * a per-visitor generated document, so it's rendered once here rather
 * than on every request. Re-run after meaningfully changing the kit
 * essentiel content or the DEMO_BANGKOK_SLUGS place list.
 *
 * Usage: npx tsx --env-file=.env scripts/render-demo-pdf.ts
 * (requires the app running locally at the URL below).
 */
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const APP_URL = process.env.RENDER_DEMO_PDF_URL ?? "http://localhost:3000";
const OUT_PATH = "public/demo/bangkok-apercu.pdf";

async function main() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const response = await page.goto(`${APP_URL}/pdf/demo`, { waitUntil: "networkidle" });
    if (!response || !response.ok()) {
      throw new Error(`/pdf/demo returned ${response?.status()}`);
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

    await writeFile(OUT_PATH, pdfBuffer);
    console.log(`Wrote ${OUT_PATH} (${(pdfBuffer.length / 1024).toFixed(0)} KB)`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
