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

      {/* The actual product, tried live — 10 free Bangkok places, no
          account needed. Same DEMO_BANGKOK_SLUGS list that backs the
          sample PDF (see src/lib/demo.ts). */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        <div className="overflow-hidden rounded border border-line bg-sand">
          <div className="px-6 pt-6 text-center sm:px-10 sm:pt-8">
            <p className="mb-2 text-xs uppercase tracking-widest text-sage-dark">À essayer tout de suite</p>
            <h2 className="mb-3 font-serif text-2xl text-foreground">Testez la carte interactive</h2>
            <p className="mx-auto mb-6 max-w-lg text-sm text-foreground/70">
              10 lieux de Bangkok en libre accès, directement sur la vraie carte du produit — sans créer de
              compte.
            </p>
          </div>
          <Link
            href="/carte/demo"
            className="group relative block h-72 border-t border-line bg-ivory sm:h-96"
            aria-label="Ouvrir la carte interactive de démonstration"
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-sage-dark/5 transition group-hover:bg-sage-dark/10">
              <span className="rounded-full bg-sage-dark px-5 py-2.5 text-sm text-ivory shadow">
                Ouvrir la carte de démonstration →
              </span>
              <span className="text-xs text-foreground/50">Carte satellite · filtres par catégorie · fiches lieux</span>
            </div>
          </Link>
          <div className="flex flex-col items-center gap-2 px-6 py-5 text-center sm:flex-row sm:justify-between sm:px-10">
            <p className="text-sm text-foreground/70">Vous préférez lire sur papier ou hors-ligne ?</p>
            <a href="/demo/bangkok-apercu.pdf" target="_blank" rel="noreferrer" className="text-sm text-sage-dark underline">
              Télécharger l&apos;aperçu PDF gratuit →
            </a>
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
