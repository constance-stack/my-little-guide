import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * Resolves each given anchor id (e.g. "kit-essentiel", "destination-paris")
 * to the 1-indexed page it actually landed on in a rendered PDF. Chromium's
 * print engine has no CSS way to expose "what page is this on" to the HTML
 * being printed (no target-counter() support), so the only reliable way to
 * get real page numbers for a table of contents is to render once, read
 * them back out of the finished PDF's own internal link destinations (the
 * same `<a href="#id">` / `id="id"` pairs that make the PDF's internal
 * links clickable also become named destinations Chromium's renderer
 * embeds), and render a second time with those numbers now known. See
 * renderCountryPdf() in lib/pdf.ts for the two-pass call site.
 */
export async function resolvePageNumbers(pdfBytes: Uint8Array, anchorIds: string[]): Promise<Record<string, number>> {
  // pdfjs-dist insists on a plain Uint8Array — a Node Buffer (as returned by
  // Playwright's page.pdf()) is a Uint8Array subclass but fails its internal
  // check, so it must be copied into a bare one here.
  const data = new Uint8Array(pdfBytes);
  const loadingTask = getDocument({ data });
  const doc = await loadingTask.promise;
  const result: Record<string, number> = {};
  try {
    for (const id of anchorIds) {
      const dest = await doc.getDestination(id);
      if (!dest) continue;
      const pageIndex = await doc.getPageIndex(dest[0]);
      result[id] = pageIndex + 1;
    }
  } finally {
    await loadingTask.destroy();
  }
  return result;
}
