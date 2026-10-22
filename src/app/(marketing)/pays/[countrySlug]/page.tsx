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
      },
    },
  });
  if (!country) notFound();

  const kitPrice = await prisma.price.findUnique({ where: { key: "kit-thailande" } });

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 font-serif text-3xl text-sage-dark">{country.name}</h1>
      <p className="mb-8 text-sm text-foreground/70">
        Choisissez les destinations qui vous intéressent. Le kit essentiel
        {kitPrice ? ` (${(kitPrice.amountCents / 100).toFixed(2)} €)` : ""} s&apos;ajoute automatiquement à
        tout achat.
      </p>

      {/* Preview section (spec §3): two premium marketing visuals, no full
          paid content shown. Placeholder illustrations until the guide/map
          product UI (milestones 8–9) exists to screenshot for real. */}
      <section className="mb-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded border border-line bg-sand p-6 text-center text-sm text-foreground/60">
          Aperçu du guide illustré (à venir)
        </div>
        <div className="rounded border border-line bg-sand p-6 text-center text-sm text-foreground/60">
          Aperçu de la carte interactive (à venir)
        </div>
      </section>

      <DestinationPicker
        destinations={country.destinations.map((d) => ({ id: d.id, slug: d.slug, name: d.name, size: d.size }))}
      />
    </main>
  );
}
