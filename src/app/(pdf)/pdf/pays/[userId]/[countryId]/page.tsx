import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyPdfToken } from "@/lib/pdf-token";
import { getDestinationForGuide, getKitSections } from "@/content/queries";
import { PlaceCardPrint } from "@/content/render/place-card-print";
import { ZonesMap, ZoneSwatch } from "@/content/render/zones-map";
import { KitSectionBody } from "@/content/render/kit-section";

// Print-mode route: one PDF per (user, country), not per order — see
// renderCountryPdf() in lib/pdf.ts for why. This reuses
// getDestinationForGuide() and PlaceDetail from content/, the same
// functions /guide/[slug] and /lieu/[slug] use, so the PDF can never show
// different data or markup than the web guide. No site header/nav here;
// this page is only ever loaded by the PDF renderer, authenticated by a
// short-lived signed token rather than a real session (see
// lib/pdf-token.ts).
export default async function PdfCountryPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string; countryId: string }>;
  searchParams: Promise<{ token?: string; pageNumbers?: string }>;
}) {
  const { userId, countryId } = await params;
  const { token, pageNumbers: pageNumbersParam } = await searchParams;

  // Supplied on the PDF renderer's second pass only (see renderCountryPdf()
  // in lib/pdf.ts) — absent on the first, number-finding pass, so the
  // sommaire just renders without numbers that one time.
  let pageNumbers: Record<string, number> = {};
  if (pageNumbersParam) {
    try {
      pageNumbers = JSON.parse(pageNumbersParam);
    } catch {
      pageNumbers = {};
    }
  }

  const subject = `pays-${userId}-${countryId}`;
  if (!verifyPdfToken(subject, token ?? null)) notFound();

  const [user, country] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.country.findUnique({ where: { id: countryId } }),
  ]);
  if (!user || !country) notFound();

  // Every destination this user owns in this country, across however many
  // separate orders granted them — this is what makes a second purchase in
  // an already-owned country "join" the existing PDF rather than produce a
  // second, incomplete one.
  const entitlements = await prisma.entitlement.findMany({
    where: { userId, destination: { countryId } },
    include: { destination: true },
  });
  const destinationSlugs = Array.from(
    new Set(entitlements.map((e) => e.destination?.slug).filter((s): s is string => Boolean(s)))
  );
  if (destinationSlugs.length === 0) notFound();

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const [destinations, kitSections] = await Promise.all([
    Promise.all(destinationSlugs.map((slug) => getDestinationForGuide(slug, userId))).then((ds) =>
      ds.filter((d): d is NonNullable<typeof d> => d !== null)
    ),
    getKitSections(country.slug),
  ]);

  return (
    <div className="bg-ivory text-foreground">
      {/* Cover */}
      <section className="flex h-[950px] flex-col items-center justify-center text-center" style={{ breakAfter: "page" }}>
        <p className="mb-4 text-xs uppercase tracking-[0.3em] text-sage-dark">My Little Guide</p>
        <h1 className="mb-3 font-serif text-5xl text-foreground">{country.name}</h1>
        <p className="text-sm text-foreground/60">{destinations.map((d) => d.name).join(" · ")}</p>
        <p className="mt-3 text-sm text-foreground/60">
          Guide personnalisé préparé pour {user.name ?? user.email}
        </p>
      </section>

      {/* Introduction + colored neighborhood map — required at the start
          of the PDF per the editorial brief, shared with the web guide so
          both show the exact same illustration. No fixed min-height here:
          the section already gets its own page from breakAfter, so a
          forced min-height only padded it with empty space below short
          content instead of helping anything. */}
      {destinations.some((d) => d.slug === "bangkok") && (
        <section className="px-16 py-12" style={{ breakAfter: "page" }}>
          <h2 className="mb-4 font-serif text-2xl text-sage-dark">Introduction</h2>
          <p className="mb-6 text-sm leading-relaxed text-foreground/80">
            Bangkok est une ville de contrastes : temples majestueux, quartiers historiques,
            gratte-ciel, marchés animés et street food se côtoient à quelques rues d&apos;intervalle.
            Elle se découvre autant au fil du Chao Phraya que dans ses petites ruelles — mais
            Bangkok est immense, et le secret pour en profiter est de regrouper ses visites par
            quartier plutôt que de traverser la ville dans tous les sens.
          </p>
          <div className="mb-6 rounded border border-line bg-sage-dark/5 px-4 py-3 text-sm text-foreground/80">
            <span className="font-medium text-sage-dark">Little Tip — </span>
            Un hôtel qui paraît proche d&apos;une attraction sur une carte peut en réalité
            nécessiter un long trajet. Privilégiez les stations BTS/MRT, les embarcadères, et
            regroupez vos visites par quartier.
          </div>
          <ZonesMap zones={destinations.find((d) => d.slug === "bangkok")!.zones} destinationSlug="bangkok" />
        </section>
      )}

      {destinations.some((d) => d.slug === "new-york") && (
        <section className="px-16 py-12" style={{ breakAfter: "page" }}>
          <h2 className="mb-4 font-serif text-2xl text-sage-dark">Introduction</h2>
          <p className="mb-6 text-sm leading-relaxed text-foreground/80">
            New York se visite très bien à pied dans chaque quartier, mais se déplacer d&apos;un bout à
            l&apos;autre de la ville demande presque toujours le métro — il fonctionne 24h/24 et reste le moyen le
            plus rapide d&apos;éviter les embouteillages. Manhattan s&apos;étire du nord au sud sur près de 20 km :
            mieux vaut regrouper ses visites par quartier plutôt que d&apos;essayer de zigzaguer, et ne pas
            sous-estimer les distances entre Manhattan, Brooklyn, le Queens et le Bronx.
          </p>
          <div className="mb-6 rounded border border-line bg-sage-dark/5 px-4 py-3 text-sm text-foreground/80">
            <span className="font-medium text-sage-dark">Little Tip — </span>
            Le paiement du métro se fait directement par carte bancaire ou smartphone sans contact (OMNY) à chaque
            tourniquet — pas besoin d&apos;acheter de ticket à l&apos;avance.
          </div>
          <ZonesMap zones={destinations.find((d) => d.slug === "new-york")!.zones} destinationSlug="new-york" />
        </section>
      )}

      {/* Table of contents — two-column text flow (columns-2, CSS multi-
          column, reliable under print pagination unlike CSS grid) so the
          list uses the full page width instead of one narrow stack, plus
          each zone's own color swatch as a quick visual index. */}
      <section className="px-16 py-12" style={{ breakAfter: "page" }}>
        <h2 className="mb-1 font-serif text-2xl text-sage-dark">Sommaire</h2>
        <div className="mb-6 h-px w-16 bg-sage-dark" />
        <a
          href="#kit-essentiel"
          className="mb-6 flex items-baseline justify-between gap-2 text-sm font-medium text-sage-dark"
        >
          <span>Kit essentiel</span>
          {pageNumbers["kit-essentiel"] && <span>p. {pageNumbers["kit-essentiel"]}</span>}
        </a>
        <div className="columns-2 gap-10">
          {destinations.map((destination) => (
            <div key={destination.id} className="mb-6" style={{ breakInside: "avoid" }}>
              <a
                href={`#destination-${destination.slug}`}
                className="flex items-baseline justify-between gap-2 font-serif text-lg text-foreground"
              >
                <span>{destination.name}</span>
                {pageNumbers[`destination-${destination.slug}`] && (
                  <span className="text-sm text-foreground/50">
                    p. {pageNumbers[`destination-${destination.slug}`]}
                  </span>
                )}
              </a>
              <ul className="mt-2 space-y-1.5">
                {destination.zones.map((zone) => (
                  <li key={zone.id}>
                    <a
                      href={`#zone-${zone.id}`}
                      className="flex items-baseline justify-between gap-2 text-sm text-foreground/70"
                    >
                      <span className="flex items-center gap-2">
                        <ZoneSwatch color={zone.mapColor} />
                        {zone.name}
                      </span>
                      {pageNumbers[`zone-${zone.id}`] && <span>p. {pageNumbers[`zone-${zone.id}`]}</span>}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Kit essentiel — always this one country's, never ambiguous since
          this whole page is already scoped to a single country. Tinted
          panel + two-column text flow for the same reason as the
          sommaire: a single long bullet column down the middle of an
          otherwise empty wide page read as flat and wasted the width. */}
      <section id="kit-essentiel" className="px-16 py-12" style={{ breakAfter: "page" }}>
        <h2 className="mb-1 font-serif text-2xl text-sage-dark">Kit essentiel</h2>
        <div className="mb-6 h-px w-16 bg-sage-dark" />
        <div className="rounded-lg bg-sand p-6">
          <div className="columns-2 gap-8">
            {kitSections.map((section) => (
              <div key={section.id} className="mb-6" style={{ breakInside: "avoid" }}>
                <h3 className="mb-2 font-serif text-base text-foreground">{section.title}</h3>
                <KitSectionBody content={section.content} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* One chapter per destination owned in this country, each starting
          on its own page — breakBefore rather than wrapping the whole
          chapter in breakInside: avoid, which (for a destination with many
          zones and places, routinely taller than a single page) made
          Chromium's print layout try and fail to keep the whole block
          together, producing large blank gaps before it gave up and
          overflowed. Only a single place's own card — genuinely no taller
          than a page — gets breakInside: avoid below. Places render as
          compact photo-left/text-right cards (PlaceCardPrint) rather than
          the web guide's full-width PlaceDetail: dozens of places back to
          back as full-width stacked blocks was the direct cause of "too
          many pages, doesn't use the width, monotonous". */}
      {destinations.map((destination) => (
        <section
          key={destination.id}
          id={`destination-${destination.slug}`}
          className="px-16 py-12"
          style={{ breakBefore: "page" }}
        >
          <h2 className="mb-2 border-b-2 border-sage-dark pb-2 font-serif text-3xl text-sage-dark">
            {destination.name}
          </h2>

          {destination.zones.map((zone) => (
            <div key={zone.id} id={`zone-${zone.id}`} className="mb-8">
              <h3
                className="mb-1 flex items-center gap-2 font-serif text-xl text-foreground"
                style={{ breakAfter: "avoid" }}
              >
                <ZoneSwatch color={zone.mapColor} />
                Où dormir — {zone.name}
              </h3>
              <p className="mb-4 text-sm text-foreground/70" style={{ breakAfter: "avoid" }}>
                {zone.vibeText}
              </p>

              <div className="space-y-3">
                {zone.places.map((place) => (
                  <div key={place.id} id={place.slug} style={{ breakInside: "avoid" }}>
                    <PlaceCardForPdf
                      placeId={place.id}
                      appUrl={appUrl}
                      destinationSlug={destination.slug}
                      accentColor={zone.mapColor}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

async function PlaceCardForPdf({
  placeId,
  appUrl,
  destinationSlug,
  accentColor,
}: {
  placeId: string;
  appUrl: string;
  destinationSlug: string;
  accentColor: string;
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
      <PlaceCardPrint place={place} accentColor={accentColor} />
      <a
        href={`${appUrl}/carte?destination=${destinationSlug}&place=${place.slug}`}
        className="pl-4 text-[10px] text-sage-dark underline"
      >
        Voir sur ma carte →
      </a>
    </div>
  );
}
