import Link from "next/link";
import { prisma } from "@/lib/db";
import { MapPageClient } from "@/components/map/map-page-client";

export default async function HomePage() {
  const countries = await prisma.country.findMany({
    where: { destinations: { some: { status: "PUBLISHED" } } },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { destinations: { where: { status: "PUBLISHED" } } } },
    },
  });
  const destinationCount = countries.reduce((sum, c) => sum + c._count.destinations, 0);

  return (
    <main>
      {/* Abstract travel-routes motif instead of a single destination's
          photo — the catalog isn't staying Thailand-only, so the hero
          shouldn't visually commit to one country. Pure line art (dashed
          flight paths + waypoint dots) in the brand's own palette, no
          photo/licensing to track and no favoritism towards whichever
          destination happens to have the nicest picture. */}
      <section className="relative mx-auto max-w-5xl overflow-hidden bg-sage-dark sm:mx-6 sm:mt-6 sm:rounded-2xl lg:mx-auto">
        <svg
          viewBox="0 0 1200 460"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="heroGlow" cx="50%" cy="32%" r="75%">
              <stop offset="0%" stopColor="#1d3a5f" />
              <stop offset="100%" stopColor="#071423" />
            </radialGradient>
          </defs>
          <rect width="1200" height="460" fill="url(#heroGlow)" />
          {/* Paths and dots are kept to the outer margins (top/bottom
              strips and far left/right edges) — the first version put
              waypoint dots right behind the centered headline/subtext,
              which fought with reading the text. */}
          <g stroke="#faf8f3" strokeWidth="1" fill="none" opacity="0.25">
            <path d="M -40 65 Q 300 12 620 60 T 1260 32" strokeDasharray="2 7" />
            <path d="M -40 415 Q 320 448 640 410 T 1260 435" strokeDasharray="2 7" />
          </g>
          <g fill="#faf8f3">
            <circle cx="70" cy="60" r="3" opacity="0.45" />
            <circle cx="965" cy="48" r="3.5" opacity="0.5" />
            <circle cx="1150" cy="95" r="3" opacity="0.4" />
            <circle cx="110" cy="400" r="3" opacity="0.45" />
            <circle cx="1100" cy="410" r="4" opacity="0.6" />
            <circle cx="40" cy="240" r="2.5" opacity="0.35" />
            <circle cx="1165" cy="250" r="2.5" opacity="0.35" />
          </g>
          <g stroke="#faf8f3" fill="none" opacity="0.3">
            <circle cx="1100" cy="410" r="9" strokeWidth="1" />
          </g>
        </svg>
        <div className="relative px-4 py-24 text-center sm:py-32">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-ivory/20 px-3 py-1 text-xs uppercase tracking-widest text-ivory/80">
            {countries.length} pays · {destinationCount} destinations
          </p>
          <h1 className="mx-auto mb-6 max-w-2xl text-balance font-serif text-4xl leading-tight text-ivory sm:text-6xl">
            Composez votre propre guide, destination par destination
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-balance text-ivory/85 sm:text-lg">
            Un guide premium — PDF personnalisé et guide interactif — associé à une carte privée regroupant
            toutes vos adresses, pour un voyage réellement préparé.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/pays"
              className="inline-block rounded-full bg-ivory px-7 py-3 text-sm font-medium text-sage-dark transition hover:opacity-90"
            >
              Découvrir le monde
            </Link>
            <a
              href="#essayer"
              className="inline-block rounded-full border border-ivory/30 px-7 py-3 text-sm text-ivory transition hover:border-ivory/60"
            >
              Essayer la carte gratuitement
            </a>
          </div>
          <p className="mx-auto mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-ivory/60">
            <span>PDF personnalisé</span>
            <span aria-hidden="true">·</span>
            <span>Carte privée</span>
            <span aria-hidden="true">·</span>
            <span>Lieux vérifiés un par un</span>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-20 sm:py-24">
        <div className="grid gap-5 sm:grid-cols-3">
          <FeatureCard
            accent="#a8d4e8"
            icon={<BookIcon />}
            title="Un guide, pas un PDF basique"
            description="Couverture personnalisée, sommaire cliquable, conseils pratiques et Little Tips — pensé pour être lu sur mobile pendant le voyage."
          />
          <FeatureCard
            accent="#a8e8ce"
            icon={<PinIcon />}
            title="Une carte vraiment utile"
            description="Uniquement les adresses des destinations achetées, avec recherche, filtres par catégorie et favoris synchronisés sur tous vos appareils."
          />
          <FeatureCard
            accent="#f5bea0"
            icon={<CheckIcon />}
            title="Des lieux vérifiés, pas du contenu générique"
            description="Chaque adresse est choisie et décrite à la main, avec de vraies photos — pas de liste automatique ni de texte générique."
          />
        </div>
      </section>

      {/* The actual product, tried live — 10 free Bangkok places, no
          account needed. Same DEMO_BANGKOK_SLUGS list that backs the
          sample PDF (see src/lib/demo.ts). */}
      <section id="essayer" className="mx-auto max-w-4xl scroll-mt-6 px-4 py-20 sm:py-24">
        <div className="overflow-hidden rounded-2xl border border-line bg-ivory shadow-sm">
          <div className="px-6 pt-8 text-center sm:px-10 sm:pt-10">
            <p className="mb-2 inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-sage-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-sage-dark" aria-hidden="true" />À essayer tout de suite
            </p>
            <h2 className="mb-3 font-serif text-2xl text-foreground sm:text-3xl">Testez la carte interactive</h2>
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

      <section className="mx-auto max-w-5xl px-4 py-20 sm:py-24">
        <h2 className="mb-2 font-serif text-2xl text-sage-dark sm:text-3xl">Destinations disponibles</h2>
        <p className="mb-8 text-sm text-foreground/60">Choisissez un pays pour voir ses destinations.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {countries.map((country) => (
            <Link
              key={country.id}
              href={`/pays/${country.slug}`}
              className="group flex items-center justify-between rounded-xl border border-line bg-ivory px-5 py-4 transition hover:-translate-y-0.5 hover:border-sage-dark hover:shadow-md"
            >
              <span>
                <span className="block font-serif text-base text-foreground group-hover:text-sage-dark">
                  {country.name}
                </span>
                <span className="block text-xs text-foreground/50">
                  {country._count.destinations} destination{country._count.destinations > 1 ? "s" : ""}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="text-foreground/30 transition group-hover:translate-x-0.5 group-hover:text-sage-dark"
              >
                →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  accent,
  icon,
  title,
  description,
}: {
  accent: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-ivory p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: accent }}
      >
        {icon}
      </div>
      <h2 className="mb-2 font-serif text-lg text-sage-dark">{title}</h2>
      <p className="text-sm text-foreground/70">{description}</p>
    </div>
  );
}

function BookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f2a4a" strokeWidth="1.5">
      <path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 15.5v-10z" />
      <path d="M4 15.5A2.5 2.5 0 006.5 18H20v3H6.5A2.5 2.5 0 014 18.5" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f2a4a" strokeWidth="1.5">
      <path d="M12 21s7-7.58 7-12.5A7 7 0 1 0 5 8.5C5 13.42 12 21 12 21z" />
      <circle cx="12" cy="8.5" r="2.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0f2a4a" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
