/**
 * Renders KitSection.content as a scannable bullet list instead of one
 * dense paragraph. Content is stored as plain text with one point per
 * line (see prisma/seed-real-content.ts) — a lone single-line value still
 * falls back to a plain paragraph so unrestructured content never renders
 * as a single, orphan bullet.
 */
export function KitSectionBody({ content }: { content: string }) {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return <p className="text-sm leading-relaxed text-foreground/80">{content}</p>;
  }

  return (
    <ul className="space-y-2">
      {lines.map((line, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground/80">
          <span className="mt-0.5 shrink-0 text-sage-dark">•</span>
          <span>{line.replace(/^[-•]\s*/, "")}</span>
        </li>
      ))}
    </ul>
  );
}
