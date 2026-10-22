import { prisma } from "@/lib/db";

/**
 * The single access-control chokepoint. Every route or Server Component
 * that returns place/chapter/photo content for a destination must call
 * this first — never trust a client-side ownership flag.
 */
export async function hasAccess(userId: string | undefined | null, destinationId: string): Promise<boolean> {
  if (!userId) return false;
  const entitlement = await prisma.entitlement.findUnique({
    where: { userId_destinationId: { userId, destinationId } },
  });
  return entitlement !== null;
}

export async function entitledDestinationIds(userId: string | undefined | null): Promise<string[]> {
  if (!userId) return [];
  const entitlements = await prisma.entitlement.findMany({
    where: { userId, destinationId: { not: null } },
    select: { destinationId: true },
  });
  return entitlements.map((e) => e.destinationId!);
}

/** The country-wide "kit" entitlement is the row with destinationId = null. */
export async function hasKit(userId: string | undefined | null): Promise<boolean> {
  if (!userId) return false;
  const entitlement = await prisma.entitlement.findFirst({
    where: { userId, destinationId: null },
  });
  return entitlement !== null;
}
