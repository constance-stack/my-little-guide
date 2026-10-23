/**
 * The free, no-account-needed preview of the product: a fixed set of real
 * Bangkok places shown on the interactive map demo and in the sample PDF,
 * so a visitor can see the actual product before buying. Hand-picked for
 * variety (temples, market, street food, river, viewpoint, park) rather
 * than generated, since this list should stay small and deliberate.
 */
export const DEMO_BANGKOK_SLUGS = [
  "wat-arun",
  "wat-pho",
  "grand-palace",
  "jim-thompson-house",
  "chatuchak-weekend-market",
  "yaowarat-road",
  "chao-phraya-river",
  "mahanakhon-skywalk",
  "lumphini-park",
  "erawan-shrine",
] as const;

export function isDemoPlaceSlug(slug: string): boolean {
  return (DEMO_BANGKOK_SLUGS as readonly string[]).includes(slug);
}
