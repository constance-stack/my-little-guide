import { prisma } from "@/lib/db";

export type CartLine = {
  key: string;
  label: string;
  amountCents: number;
  destinationId: string | null;
};

/**
 * The destination price tiers are driven by how much content a guide
 * actually has, not a manually-assigned SMALL/LARGE size — a destination
 * that grows from 40 to 80 places should reprice itself automatically
 * rather than needing someone to remember to bump it. Each tier is still
 * a normal, admin-editable Price row (see admin/pricing), just selected
 * by live published-place count instead of a fixed field.
 */
const PLACE_COUNT_TIERS: { maxPlaces: number; key: string }[] = [
  { maxPlaces: 49, key: "destination-tier1" },
  { maxPlaces: 100, key: "destination-tier2" },
  { maxPlaces: 200, key: "destination-tier3" },
  { maxPlaces: Infinity, key: "destination-tier4" },
];

export function tierKeyForPlaceCount(placeCount: number): string {
  return PLACE_COUNT_TIERS.find((t) => placeCount <= t.maxPlaces)!.key;
}

/** All four tier Price rows, keyed by their Price.key — fetch once, reuse per destination. */
export async function fetchTierPrices() {
  const rows = await prisma.price.findMany({ where: { key: { in: PLACE_COUNT_TIERS.map((t) => t.key) } } });
  return new Map(rows.map((p) => [p.key, p]));
}

export function resolveDestinationPrice(
  dest: { priceOverride: { amountCents: number; active: boolean } | null; _count: { places: number } },
  tierPrices: Map<string, { amountCents: number; active: boolean }>
) {
  return dest.priceOverride ?? tierPrices.get(tierKeyForPlaceCount(dest._count.places));
}

/**
 * Computes the real cart total server-side from the Price table — never
 * trusts client-sent amounts. The Thailand kit is never a priced line: it
 * comes free and automatic with any destination purchase (granted
 * directly by the webhook, see handleCheckoutCompleted in
 * api/webhooks/stripe/route.ts) rather than being charged for here. A
 * destination already owned by the signed-in user is dropped (never
 * charged twice).
 */
export async function computeCartLines(
  destinationIds: string[],
  alreadyOwnedDestinationIds: string[] = []
): Promise<CartLine[]> {
  if (destinationIds.length === 0) return [];

  const owned = new Set(alreadyOwnedDestinationIds);
  const newDestinationIds = destinationIds.filter((id) => !owned.has(id));
  if (newDestinationIds.length === 0) return [];

  const [destinations, tierPrices] = await Promise.all([
    prisma.destination.findMany({
      where: { id: { in: newDestinationIds }, status: "PUBLISHED" },
      include: { priceOverride: true, _count: { select: { places: { where: { status: "PUBLISHED" } } } } },
    }),
    fetchTierPrices(),
  ]);

  const lines: CartLine[] = [];

  for (const dest of destinations) {
    const price = resolveDestinationPrice(dest, tierPrices);
    if (!price || !price.active) continue;
    lines.push({
      key: `destination-${dest.id}`,
      label: dest.name,
      amountCents: price.amountCents,
      destinationId: dest.id,
    });
  }

  return lines;
}

export function sumCents(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.amountCents, 0);
}
