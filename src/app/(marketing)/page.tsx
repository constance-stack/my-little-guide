import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function HomePage() {
  const countries = await prisma.country.findMany({
    where: { destinations: { some: { status: "PUBLISHED" } } },
    orderBy: { name: "asc" },
  });

  return (
    <main>
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="mb-3 text-xs uppercase tracking-widest text-sage-dark">Guides de voyage numériques</p>
        <h1 className="mb-6 font-serif text-4xl text-foreground sm:text-5xl">
          Composez votre propre guide, destination par destination
        </h1>
        <p className="mx-auto mb-10 max-w-xl text-foreground/70">
          Un guide premium — PDF personnalisé et guide interactif — associé à une carte privée regroupant
          toutes vos adresses, pour un voyage réellement préparé.
        </p>
        <Link
          href="/pays/thailande"
          className="inline-block rounded bg-sage-dark px-6 py-3 text-sm text-ivory hover:opacity-90"
        >
          Découvrir la Thaïlande
        </Link>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="rounded border border-line bg-sand p-6">
            <h2 className="mb-2 font-serif text-lg text-sage-dark">Un guide, pas un PDF basique</h2>
            <p className="text-sm text-foreground/70">
              Couverture personnalisée, sommaire cliquable, conseils pratiques et Little Tips — pensé pour
              être lu sur mobile pendant le voyage.
            </p>
          </div>
          <div className="rounded border border-line bg-sand p-6">
            <h2 className="mb-2 font-serif text-lg text-sage-dark">Une carte vraiment utile</h2>
            <p className="text-sm text-foreground/70">
              Uniquement les adresses des destinations achetées, avec recherche, filtres par catégorie et
              favoris synchronisés sur tous vos appareils.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16">
        <h2 className="mb-6 font-serif text-2xl text-sage-dark">Destinations disponibles</h2>
        <div className="flex flex-wrap gap-3">
          {countries.map((country) => (
            <Link
              key={country.id}
              href={`/pays/${country.slug}`}
              className="rounded border border-line bg-ivory px-4 py-2 text-sm hover:border-sage-dark hover:text-sage-dark"
            >
              {country.name}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
