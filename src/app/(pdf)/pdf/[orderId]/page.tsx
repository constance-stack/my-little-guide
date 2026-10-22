import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPdfToken } from "@/lib/pdf-token";
import { getDestinationForGuide } from "@/content/queries";
import { PlaceDetail } from "@/content/render/place-detail";

// Print-mode route: this IS the web guide, rendered for Playwright rather
// than a browser tab. It intentionally reuses getDestinationForGuide() and
// PlaceDetail from content/, the same functions /guide/[slug] and
// /lieu/[slug] use — so the PDF can never show different data or markup
// than the web guide. No site header/nav here; this page is only ever
// loaded by the PDF renderer, authenticated by a short-lived signed token
// rather than a real session (see lib/pdf-token.ts).
export default async function PdfOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { orderId } = await params;
  const { token } = await searchParams;

  if (!verifyPdfToken(orderId, token ?? null)) notFound();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true, lines: { include: { destination: true } } },
  });
  if (!order) notFound();

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const destinationSlugs = Array.from(
    new Set(order.lines.map((l) => l.destination?.slug).filter((s): s is string => Boolean(s)))
  );

  const destinations = (
    await Promise.all(destinationSlugs.map((slug) => getDestinationForGuide(slug, order.userId)))
  ).filter((d): d is NonNullable<typeof d> => d !== null);

  return (
    <div className="bg-ivory text-foreground">
      {/* Cover */}
      <section className="flex h-[950px] flex-col items-center justify-center text-center" style={{ breakAfter: "page" }}>
        <p className="mb-4 text-xs uppercase tracking-[0.3em] text-sage-dark">My Little Guide</p>
        <h1 className="mb-3 font-serif text-5xl text-foreground">
          {destinations.map((d) => d.name).join(" · ")}
        </h1>
        <p className="text-sm text-foreground/60">
          Guide personnalisé préparé pour {order.user.name ?? order.user.email}
        </p>
        <p className="mt-1 text-sm text-foreground/60">{order.createdAt.toLocaleDateString("fr-FR")}</p>
      </section>

      {/* Table of contents */}
      <section className="min-h-[600px] px-16 py-12" style={{ breakAfter: "page" }}>
        <h2 className="mb-6 font-serif text-2xl text-sage-dark">Sommaire</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <a href="#kit-essentiel" className="text-foreground/80">
              Kit essentiel
            </a>
          </li>
          {destinations.map((destination) => (
            <li key={destination.id}>
              <a href={`#destination-${destination.slug}`} className="font-medium text-foreground/80">
                {destination.name}
              </a>
              <ul className="ml-4 mt-1 space-y-1">
                {destination.zones.map((zone) => (
                  <li key={zone.id}>
                    <a href={`#zone-${zone.id}`} className="text-foreground/60">
                      {zone.name}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      {/* Kit essentiel */}
      <section id="kit-essentiel" className="min-h-[400px] px-16 py-12" style={{ breakAfter: "page" }}>
        <h2 className="mb-4 font-serif text-2xl text-sage-dark">Kit essentiel</h2>
        <p className="text-sm text-foreground/80">
          [Contenu provisoire] Conseils pratiques généraux (visas, monnaie, transports, sécurité) à
          rédiger depuis l&apos;administration.
        </p>
      </section>

      {/* One chapter per destination */}
      {destinations.map((destination) => (
        <section key={destination.id} id={`destination-${destination.slug}`} className="px-16 py-12">
          <h2 className="mb-2 font-serif text-3xl text-sage-dark">{destination.name}</h2>

          {destination.zones.map((zone) => (
            <div key={zone.id} id={`zone-${zone.id}`} className="mb-10" style={{ breakInside: "avoid" }}>
              <h3 className="mb-1 font-serif text-xl text-foreground">Où dormir — {zone.name}</h3>
              <p className="mb-6 text-sm text-foreground/70">{zone.vibeText}</p>

              {zone.places.map((place) => (
                <div key={place.id} id={place.slug} className="mb-8" style={{ breakInside: "avoid" }}>
                  <PlaceDetailForPdf placeId={place.id} userId={order.userId} appUrl={appUrl} destinationSlug={destination.slug} />
                </div>
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

async function PlaceDetailForPdf({
  placeId,
  userId,
  appUrl,
  destinationSlug,
}: {
  placeId: string;
  userId: string;
  appUrl: string;
  destinationSlug: string;
}) {
  const place = await prisma.place.findUnique({
    where: { id: placeId },
    include: {
      destination: true,
      zone: true,
      categories: { include: { category: true } },
      photos: { include: { photo: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!place) return null;

  return (
    <div>
      <PlaceDetail place={place} />
      <a href={`${appUrl}/carte?destination=${destinationSlug}&place=${place.slug}`} className="text-sm text-sage-dark underline">
        Voir sur ma carte →
      </a>
    </div>
  );
}
