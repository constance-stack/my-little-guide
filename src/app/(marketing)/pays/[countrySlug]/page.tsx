import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DestinationPicker } from "./destination-picker";

export default async function CountryPage({ params }: { params: Promise<{ countrySlug: string }> }) {
  const { countrySlug } = await params;
  const country = await prisma.country.findUnique({
    where: { slug: countrySlug },
    include: {
      destinations: {
        where: { status: "PUBLISHED" },
        orderBy: { name: "asc" },
        include: { _count: { select: { places: { where: { status: "PUBLISHED" } } } } },
      },
    },
  });
  if (!country) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 font-serif text-3xl text-sage-dark">{country.name}</h1>
      <p className="mb-8 text-sm text-foreground/70">
        Choisissez les destinations qui vous intéressent. Le kit essentiel est inclus automatiquement et
        gratuitement avec tout achat.
      </p>

      {/* Preview section (spec §3): the real product, not a mockup — a
          device mockup built from real screenshots of the live map demo
          (10 free Bangkok places, no account needed) and the downloadable
          sample PDF, both from the same DEMO_BANGKOK_SLUGS list as
          /pdf/demo (see src/lib/demo.ts). */}
      <section className="mb-10 grid gap-4 sm:grid-cols-2">
        <Link
          href="/carte/demo"
          className="group overflow-hidden rounded border border-line bg-sand transition hover:border-sage-dark"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/preview-map.jpg" alt="" className="h-40 w-full bg-ivory object-contain" />
          <div className="p-6 text-center">
            <p className="mb-1 font-serif text-lg text-sage-dark">Carte interactive</p>
            <p className="text-sm text-foreground/60">
              Essayez-la gratuitement avec 10 lieux de Bangkok — aucun compte requis.
            </p>
            <span className="mt-3 inline-block text-xs text-sage-dark underline">Ouvrir la carte →</span>
          </div>
        </Link>
        <a
          href="/demo/bangkok-apercu.pdf"
          target="_blank"
          rel="noreferrer"
          className="group overflow-hidden rounded border border-line bg-sand transition hover:border-sage-dark"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/preview-pdf.jpg" alt="" className="h-40 w-full bg-ivory object-contain" />
          <div className="p-6 text-center">
            <p className="mb-1 font-serif text-lg text-sage-dark">Guide PDF</p>
            <p className="text-sm text-foreground/60">
              Téléchargez un aperçu gratuit : le kit essentiel et 10 fiches lieux, en situation.
            </p>
            <span className="mt-3 inline-block text-xs text-sage-dark underline">Télécharger le PDF →</span>
          </div>
        </a>
      </section>

      <DestinationPicker
        destinations={country.destinations.map((d) => ({
          id: d.id,
          slug: d.slug,
          name: d.name,
          size: d.size,
          placeCount: d._count.places,
        }))}
      />
    </main>
  );
}
