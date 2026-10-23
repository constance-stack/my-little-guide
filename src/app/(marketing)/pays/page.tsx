import Link from "next/link";
import { prisma } from "@/lib/db";

// The "Découvrir le monde" landing from the homepage hero — one entry
// point for every country, so the hero never has to name one specific
// country by itself as the catalog grows beyond Thailand.
export default async function PaysIndexPage() {
  const countries = await prisma.country.findMany({
    where: { destinations: { some: { status: "PUBLISHED" } } },
    orderBy: { name: "asc" },
    include: {
      destinations: {
        where: { status: "PUBLISHED" },
        include: { _count: { select: { places: { where: { status: "PUBLISHED" } } } } },
      },
    },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-2 font-serif text-3xl text-sage-dark">Destinations</h1>
      <p className="mb-10 text-sm text-foreground/70">
        Choisissez un pays, puis composez votre guide destination par destination.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {countries.map((country) => {
          const placeCount = country.destinations.reduce((sum, d) => sum + d._count.places, 0);
          return (
            <Link
              key={country.id}
              href={`/pays/${country.slug}`}
              className="rounded border border-line bg-ivory p-6 transition hover:border-sage-dark"
            >
              <h2 className="mb-1 font-serif text-xl text-sage-dark">{country.name}</h2>
              <p className="text-sm text-foreground/60">
                {country.destinations.length} destination{country.destinations.length > 1 ? "s" : ""} · {placeCount} lieux
              </p>
            </Link>
          );
        })}

        {countries.length === 0 && <p className="text-sm text-foreground/60">Aucune destination disponible pour le moment.</p>}
      </div>
    </main>
  );
}
