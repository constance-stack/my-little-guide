import { prisma } from "@/lib/db";
import { getKitSections } from "@/content/queries";
import { PlaceDetail } from "@/content/render/place-detail";
import { KitSectionBody } from "@/content/render/kit-section";
import { DEMO_BANGKOK_SLUGS } from "@/lib/demo";

// Public, no-token print source for the free sample PDF: the kit essentiel
// plus the fixed DEMO_BANGKOK_SLUGS places, rendered with the exact same
// PlaceDetail component as the real guide and the real order PDF — the
// sample has to look like the actual product, not a mockup. Unlike
// /pdf/[orderId], this route carries no personal data, so it needs no
// signed token: it's a public marketing asset, re-rendered to a static
// file (see scripts/render-demo-pdf.ts) rather than regenerated per
// visitor.
export default async function PdfDemoPage() {
  const [kitSections, places] = await Promise.all([
    getKitSections("thailande"),
    prisma.place.findMany({
      where: { status: "PUBLISHED", slug: { in: [...DEMO_BANGKOK_SLUGS] } },
      include: {
        destination: true,
        zone: true,
        categories: { include: { category: true } },
        photos: { include: { photo: true }, orderBy: { sortOrder: "asc" } },
      },
    }),
  ]);

  // Keep the fixed, deliberate order from DEMO_BANGKOK_SLUGS rather than
  // whatever order the database happens to return.
  const orderedPlaces = DEMO_BANGKOK_SLUGS.map((slug) => places.find((p) => p.slug === slug)).filter(
    (p): p is NonNullable<typeof p> => p !== undefined
  );

  return (
    <div className="bg-ivory text-foreground">
      <section className="flex h-[950px] flex-col items-center justify-center text-center" style={{ breakAfter: "page" }}>
        <p className="mb-4 text-xs uppercase tracking-[0.3em] text-sage-dark">My Little Guide</p>
        <h1 className="mb-3 font-serif text-5xl text-foreground">Bangkok — Aperçu gratuit</h1>
        <p className="text-sm text-foreground/60">
          {orderedPlaces.length} lieux en avant-goût du guide complet, personnalisé une fois acheté.
        </p>
      </section>

      <section className="min-h-[400px] px-16 py-12" style={{ breakAfter: "page" }}>
        <h2 className="mb-6 font-serif text-2xl text-sage-dark">Kit essentiel</h2>
        {kitSections.map((section) => (
          <div key={section.id} className="mb-6" style={{ breakInside: "avoid" }}>
            <h3 className="mb-2 font-serif text-lg text-foreground">{section.title}</h3>
            <KitSectionBody content={section.content} />
          </div>
        ))}
      </section>

      <section className="px-16 py-12">
        <h2 className="mb-6 font-serif text-2xl text-sage-dark">Bangkok — 10 lieux en aperçu</h2>
        {orderedPlaces.map((place) => (
          <div key={place.id} className="mb-8" style={{ breakInside: "avoid" }}>
            <PlaceDetail place={place} />
          </div>
        ))}
        <p className="mt-8 text-sm text-foreground/70">
          Le guide complet Bangkok compte plus de 100 lieux, classés par quartier, avec votre carte privée et
          votre PDF personnalisé. Rendez-vous sur my-little-guide pour le découvrir en entier.
        </p>
      </section>
    </div>
  );
}
