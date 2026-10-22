import { prisma } from "@/lib/db";

type Role = "USER" | "ADMIN" | undefined | null;

/**
 * The single access-control chokepoint. Every route or Server Component
 * that returns place/chapter/photo content for a destination must call
 * this first — never trust a client-side ownership flag.
 *
 * An ADMIN always passes, regardless of real purchases — the site owner
 * needs to preview the guide/map/PDF exactly as a customer would see it
 * without buying their own product. This is the only bypass in the app;
 * it never applies to the USER role, and still requires a real admin
 * session (role is read from the signed session, not client input).
 */
export async function hasAccess(
  userId: string | undefined | null,
  destinationId: string,
  role?: Role
): Promise<boolean> {
  if (!userId) return false;
  if (role === "ADMIN") return true;
  const entitlement = await prisma.entitlement.findUnique({
    where: { userId_destinationId: { userId, destinationId } },
  });
  return entitlement !== null;
}

export async function entitledDestinationIds(userId: string | undefined | null, role?: Role): Promise<string[]> {
  if (!userId) return [];
  if (role === "ADMIN") {
    const published = await prisma.destination.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true },
    });
    return published.map((d) => d.id);
  }
  const entitlements = await prisma.entitlement.findMany({
    where: { userId, destinationId: { not: null } },
    select: { destinationId: true },
  });
  return entitlements.map((e) => e.destinationId!);
}

/** The country-wide "kit" entitlement is the row with destinationId = null. */
export async function hasKit(userId: string | undefined | null, role?: Role): Promise<boolean> {
  if (!userId) return false;
  if (role === "ADMIN") return true;
  const entitlement = await prisma.entitlement.findFirst({
    where: { userId, destinationId: null },
  });
  return entitlement !== null;
}
