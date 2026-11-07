import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPdfToken } from "@/lib/pdf-token";
import { getPlaceForGuide, getKitSections } from "@/content/queries";
import { PlaceCardPrint } from "@/content/render/place-card-print";
import { KitSectionBody } from "@/content/render/kit-section";

// Print-mode route for the "my itinerary" PDF — same pattern as
// (pdf)/pdf/favoris/[userId]: reuses getPlaceForGuide()/PlaceDetail from
// content/ so this can never show different data or markup than
// /lieu/[slug], and is authenticated by a short-lived signed token (see
// lib/pdf-token.ts) rather than a real session, since Playwright has no
// login cookie. getPlaceForGuide() re-checks entitlement per place, so a
// stop left over from a since-refunded destination is silently dropped
// rather than leaking content the user no longer has access to.
export default async function ItineraryPdfPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { userId } = await params;
  const { token } = await searchParams;

  if (!verifyPdfToken(`itineraire-${userId}`, token ?? null)) notFound();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) notFound();

  const tripDays = await prisma.tripDay.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
    include: { stops: { orderBy: { sortOrder: "asc" }, include: { place: true } } },
  });

  // Each day's stops, re-verified through the same entitlement check the
  // web guide uses, with any now-inaccessible place dropped.
  const days = await Promise.all(
    tripDays.map(async (day) => ({
      id: day.id,
      label: day.label,
      date: day.date,
      places: (
        await Promise.all(day.stops.map((s) => getPlaceForGuide(s.place.slug, userId, "USER")))
      ).filter((p): p is NonNullable<typeof p> => p !== null),
    }))
  );

  // The kit essentiel for every country among this itinerary's places —
  // almost always one, but an itinerary can span several countries, and
  // each gets its own kit chapter rather than only the first one shown.
  // getPlaceForGuide()'s destination include doesn't carry the nested
  // country relation, only destination.countryId, so the country rows are
  // resolved separately here.
  const countryIds = Array.from(
    new Set(days.flatMap((d) => d.places.map((p) => p.destination.countryId)))
  );
  const countries = await prisma.country.findMany({ where: { id: { in: countryIds } } });
  const kitByCountry = await Promise.all(
    countries.map(async (country) => ({
      slug: country.slug,
      name: country.name,
      sections: await getKitSections(country.slug),
    }))
  );

  const totalPlaces = days.reduce((sum, d) => sum + d.places.length, 0);

  return (
    <div className="bg-ivory text-foreground">
      <section className="flex h-[950px] flex-col items-center justify-center text-center" style={{ breakAfter: "page" }}>
        <p className="mb-4 text-xs uppercase tracking-[0.3em] text-sage-dark">My Little Guide</p>
        <h1 className="mb-3 font-serif text-5xl text-foreground">Mon itinéraire</h1>
        <p className="text-sm text-foreground/60">
          {days.length} jour{days.length > 1 ? "s" : ""} · {totalPlaces} lieu{totalPlaces > 1 ? "x" : ""} pour{" "}
          {user.name ?? user.email}
        </p>
      </section>

      {kitByCountry.some((k) => k.sections.length > 0) && (
        <section className="px-16 py-12" style={{ breakAfter: "page" }}>
          {kitByCountry.map(
            (kit) =>
              kit.sections.length > 0 && (
                <div key={kit.slug} className="mb-10">
                  <h2 className="mb-6 font-serif text-2xl text-sage-dark">Kit essentiel — {kit.name}</h2>
                  {kit.sections.map((section) => (
                    <div key={section.id} className="mb-6" style={{ breakInside: "avoid" }}>
                      <h3 className="mb-2 font-serif text-lg text-foreground">{section.title}</h3>
                      <KitSectionBody content={section.content} />
                    </div>
                  ))}
                </div>
              )
          )}
        </section>
      )}

      {days.length === 0 ? (
        <section className="px-16 py-12">
          <p className="text-sm text-foreground/70">Aucun jour dans cet itinéraire pour l&apos;instant.</p>
        </section>
      ) : (
        days.map((day, i) => (
          <section key={day.id} className="px-16 py-12" style={{ breakAfter: i < days.length - 1 ? "page" : "auto" }}>
            <h2 className="mb-1 font-serif text-3xl text-sage-dark">
              {day.label || `Jour ${i + 1}`}
            </h2>
            {day.date && (
              <p className="mb-6 text-sm text-foreground/60">
                {new Date(day.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            )}

            {day.places.length === 0 ? (
              <p className="text-sm text-foreground/60">Aucun lieu prévu ce jour-là.</p>
            ) : (
              <div className="space-y-3">
                {day.places.map((place) => (
                  <div key={place.id} style={{ breakInside: "avoid" }}>
                    <PlaceCardPrint place={place} accentColor={place.zone?.mapColor} />
                  </div>
                ))}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}
