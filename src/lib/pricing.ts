import { prisma } from "@/lib/db";

export type CartLine = {
  key: string;
  label: string;
  amountCents: number;
  destinationId: string | null;
};

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

  const destinations = await prisma.destination.findMany({
    where: { id: { in: newDestinationIds }, status: "PUBLISHED" },
    include: { priceOverride: true },
  });

  const [smallPrice, largePrice] = await Promise.all([
    prisma.price.findUnique({ where: { key: "destination-small" } }),
    prisma.price.findUnique({ where: { key: "destination-large" } }),
  ]);

  const lines: CartLine[] = [];

  for (const dest of destinations) {
    const price = dest.priceOverride ?? (dest.size === "LARGE" ? largePrice : smallPrice);
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
