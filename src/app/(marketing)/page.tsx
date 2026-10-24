import Link from "next/link";
import { prisma } from "@/lib/db";
import { MapPageClient } from "@/components/map/map-page-client";

export default async function HomePage() {
  const countries = await prisma.country.findMany({
    where: { destinations: { some: { status: "PUBLISHED" } } },
    orderBy: { name: "asc" },
  });

  return (
    <main>
      {/* Abstract travel-routes motif instead of a single destination's
          photo — the catalog isn't staying Thailand-only, so the hero
          shouldn't visually commit to one country. Pure line art (dashed
          flight paths + waypoint dots) in the brand's own palette, no
          photo/licensing to track and no favoritism towards whichever
          destination happens to have the nicest picture. */}
      <section className="relative mx-auto max-w-5xl overflow-hidden bg-sage-dark sm:mx-6 sm:mt-6 sm:rounded-lg lg:mx-auto">
        <svg
          viewBox="0 0 1200 420"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="heroGlow" cx="50%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#8a4d3a" />
              <stop offset="100%" stopColor="#2e221c" />
            </radialGradient>
          </defs>
          <rect width="1200" height="420" fill="url(#heroGlow)" />
          {/* Paths and dots are kept to the outer margins (top/bottom
              strips and far left/right edges) — the first version put
              waypoint dots right behind the centered headline/subtext,
              which fought with reading the text. */}
          <g stroke="#faf8f3" strokeWidth="1" fill="none" opacity="0.25">
            <path d="M -40 60 Q 300 10 620 55 T 1260 30" strokeDasharray="2 7" />
            <path d="M -40 380 Q 320 410 640 375 T 1260 400" strokeDasharray="2 7" />
          </g>
          <g fill="#faf8f3">
            <circle cx="70" cy="55" r="3" opacity="0.45" />
            <circle cx="965" cy="45" r="3.5" opacity="0.5" />
            <circle cx="1150" cy="90" r="3" opacity="0.4" />
            <circle cx="110" cy="365" r="3" opacity="0.45" />
            <circle cx="1100" cy="375" r="4" opacity="0.6" />
            <circle cx="40" cy="220" r="2.5" opacity="0.35" />
            <circle cx="1165" cy="230" r="2.5" opacity="0.35" />
          </g>
          <g stroke="#faf8f3" fill="none" opacity="0.3">
            <circle cx="1100" cy="375" r="9" strokeWidth="1" />
          </g>
        </svg>
        <div className="relative px-4 py-20 text-center sm:py-28">
          <p className="mb-3 text-xs uppercase tracking-widest text-ivory/80">Guides de voyage numériques</p>
          <h1 className="mx-auto mb-6 max-w-2xl font-serif text-4xl text-ivory sm:text-5xl">
            Composez votre propre guide, destination par destination
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-ivory/85">
            Un guide premium — PDF personnalisé et guide interactif — associé à une carte privée regroupant
            toutes vos adresses, pour un voyage réellement préparé.
          </p>
          <Link
            href="/pays"
            className="inline-block rounded bg-ivory px-6 py-3 text-sm text-sage-dark hover:opacity-90"
          >
            Découvrir le monde
          </Link>
        </div>
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
          <div className="relative h-[420px] border-t border-line sm:h-[520px]">
            <MapPageClient demo embedded initialDestinationSlug={null} initialPlaceSlug={null} initialCategorySlug={null} />
            <Link
              href="/carte/demo"
              className="absolute right-3 top-3 z-10 rounded-full bg-ivory/95 px-3 py-1.5 text-xs text-sage-dark shadow hover:bg-ivory"
            >
              Ouvrir en plein écran ↗
            </Link>
          </div>
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
