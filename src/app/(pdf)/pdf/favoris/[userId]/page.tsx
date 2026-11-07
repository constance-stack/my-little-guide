import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPdfToken } from "@/lib/pdf-token";
import { getPlaceForGuide } from "@/content/queries";
import { PlaceCardPrint } from "@/content/render/place-card-print";

// Print-mode route for the "my favorites" PDF. Uses getPlaceForGuide() so
// this never shows data the user doesn't have access to, same entitlement
// check as /lieu/[slug] — but renders with the compact PlaceCardPrint
// (photo left, text right) rather than PlaceDetail, which is built for
// one place filling a whole web page, not dozens back to back in a PDF.
// Authenticated by a short-lived signed token (see lib/pdf-token.ts)
// rather than a real session, since Playwright has no login cookie.
// getPlaceForGuide() re-checks entitlement per place, so a favorite left
// over from a since-refunded destination is silently dropped rather than
// leaking content the user no longer has access to.
export default async function FavoritesPdfPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { userId } = await params;
  const { token } = await searchParams;

  if (!verifyPdfToken(`favoris-${userId}`, token ?? null)) notFound();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) notFound();

  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: { place: true },
    orderBy: { createdAt: "asc" },
  });

  const places = (
    await Promise.all(favorites.map((f) => getPlaceForGuide(f.place.slug, userId, "USER")))
  ).filter((p): p is NonNullable<typeof p> => p !== null);

  const byDestination = new Map<string, { name: string; places: typeof places }>();
  for (const place of places) {
    const key = place.destination.slug;
    if (!byDestination.has(key)) byDestination.set(key, { name: place.destination.name, places: [] });
    byDestination.get(key)!.places.push(place);
  }

  return (
    <div className="bg-ivory text-foreground">
      <section className="flex h-[950px] flex-col items-center justify-center text-center" style={{ breakAfter: "page" }}>
        <p className="mb-4 text-xs uppercase tracking-[0.3em] text-sage-dark">My Little Guide</p>
        <h1 className="mb-3 font-serif text-5xl text-foreground">Mes favoris</h1>
        <p className="text-sm text-foreground/60">
          {places.length} lieu{places.length > 1 ? "x" : ""} sélectionné{places.length > 1 ? "s" : ""} pour{" "}
          {user.name ?? user.email}
        </p>
      </section>

      {places.length === 0 ? (
        <section className="px-16 py-12">
          <p className="text-sm text-foreground/70">Aucun favori pour l&apos;instant.</p>
        </section>
      ) : (
        Array.from(byDestination.entries()).map(([slug, group]) => (
          <section key={slug} className="px-16 py-12">
            <h2 className="mb-6 font-serif text-2xl text-sage-dark">{group.name}</h2>
            <div className="space-y-3">
              {group.places.map((place) => (
                <div key={place.id} style={{ breakInside: "avoid" }}>
                  <PlaceCardPrint place={place} accentColor={place.zone?.mapColor} />
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
