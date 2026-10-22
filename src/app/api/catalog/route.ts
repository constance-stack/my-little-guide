import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { entitledDestinationIds, hasKit } from "@/lib/entitlements";
import { computeCartLines, sumCents } from "@/lib/pricing";

export async function GET() {
  const session = await auth();

  const [destinations, owned, ownsKit] = await Promise.all([
    prisma.destination.findMany({
      where: { status: "PUBLISHED" },
      include: { priceOverride: true },
      orderBy: { name: "asc" },
    }),
    // Deliberately NOT passing role here: this "owned" flag drives the
    // shop's own "déjà acheté" badge and cart totals, which should reflect
    // real purchases so the shop/checkout flow itself stays testable —
    // the preview bypass belongs to content access (guide/carte/favoris),
    // not to what the shop believes you own.
    entitledDestinationIds(session?.user?.id),
    hasKit(session?.user?.id),
  ]);

  const [smallPrice, largePrice, kitPrice] = await Promise.all([
    prisma.price.findUnique({ where: { key: "destination-small" } }),
    prisma.price.findUnique({ where: { key: "destination-large" } }),
    prisma.price.findUnique({ where: { key: "kit-thailande" } }),
  ]);

  return NextResponse.json({
    destinations: destinations.map((d) => ({
      id: d.id,
      slug: d.slug,
      name: d.name,
      size: d.size,
      amountCents: (d.priceOverride ?? (d.size === "LARGE" ? largePrice : smallPrice))?.amountCents ?? 0,
      owned: owned.includes(d.id),
    })),
    kit: kitPrice ? { label: kitPrice.label, amountCents: kitPrice.amountCents } : null,
    ownsKit,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const body = await request.json().catch(() => null);
  const destinationIds: string[] = Array.isArray(body?.destinationIds) ? body.destinationIds : [];

  const [owned, ownsKit] = await Promise.all([
    entitledDestinationIds(session?.user?.id),
    hasKit(session?.user?.id),
  ]);

  const lines = await computeCartLines(destinationIds, owned, ownsKit);
  return NextResponse.json({ lines, totalCents: sumCents(lines) });
}
