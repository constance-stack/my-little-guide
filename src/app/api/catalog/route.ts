import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { entitledDestinationIds, hasKit } from "@/lib/entitlements";
import { computeCartLines, sumCents, fetchTierPrices, resolveDestinationPrice } from "@/lib/pricing";

export async function GET() {
  const session = await auth();

  const [destinations, owned, accessible, ownsKit] = await Promise.all([
    prisma.destination.findMany({
      where: { status: "PUBLISHED" },
      include: { priceOverride: true, _count: { select: { places: { where: { status: "PUBLISHED" } } } } },
      orderBy: { name: "asc" },
    }),
    // Deliberately NOT passing role here: this "owned" flag drives the
    // shop's own "déjà acheté" badge and cart totals, which should reflect
    // real purchases so the shop/checkout flow itself stays testable.
    entitledDestinationIds(session?.user?.id),
    // WITH role: same content-access bypass as the guide/carte/favoris
    // routes, so an admin's map destination switcher lists every
    // published destination to preview, not just what they've actually
    // bought.
    entitledDestinationIds(session?.user?.id, session?.user?.role),
    hasKit(session?.user?.id),
  ]);

  const [tierPrices, kitPrice] = await Promise.all([
    fetchTierPrices(),
    prisma.price.findUnique({ where: { key: "kit-thailande" } }),
  ]);

  return NextResponse.json({
    destinations: destinations.map((d) => ({
      id: d.id,
      slug: d.slug,
      name: d.name,
      size: d.size,
      amountCents: resolveDestinationPrice(d, tierPrices)?.amountCents ?? 0,
      owned: owned.includes(d.id),
      accessible: accessible.includes(d.id),
    })),
    kit: kitPrice ? { label: kitPrice.label, amountCents: kitPrice.amountCents } : null,
    ownsKit,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const body = await request.json().catch(() => null);
  const destinationIds: string[] = Array.isArray(body?.destinationIds) ? body.destinationIds : [];

  const owned = await entitledDestinationIds(session?.user?.id);

  const lines = await computeCartLines(destinationIds, owned);
  return NextResponse.json({ lines, totalCents: sumCents(lines) });
}
