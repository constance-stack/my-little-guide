import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasAccess } from "@/lib/entitlements";
import { getDestinationForGuide } from "@/content/queries";
import { GuideSearch } from "@/components/guide/guide-search";
import { ZonesMap, ZoneSwatch } from "@/content/render/zones-map";

export default async function GuideDestinationPage({
  params,
}: {
  params: Promise<{ destinationSlug: string }>;
}) {
  const { destinationSlug } = await params;
  const session = await auth();

  const destinationRow = await prisma.destination.findUnique({
    where: { slug: destinationSlug },
    include: { country: true },
  });
  if (!destinationRow) redirect("/");

  if (!session?.user) redirect(`/connexion?callbackUrl=/guide/${destinationSlug}`);

  const allowed = await hasAccess(session.user.id, destinationRow.id, session.user.role);
  if (!allowed) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="mb-4 font-serif text-2xl text-sage-dark">Guide {destinationRow.name}</h1>
        <p className="mb-6 text-sm text-foreground/70">
          Vous n&apos;avez pas encore acheté ce guide.
        </p>
        <Link href={`/pays/thailande`} className="rounded bg-sage-dark px-5 py-2.5 text-sm text-ivory hover:opacity-90">
          Voir les destinations
        </Link>
      </main>
    );
  }

  const destination = await getDestinationForGuide(destinationSlug, session.user.id, session.user.role);
  if (!destination) redirect("/");

  const allPlaces = destination.zones.flatMap((zone) =>
    zone.places.map((place) => ({
      slug: place.slug,
      name: place.name,
      zoneName: zone.name,
      categoryNames: place.categories.map((c) => c.category.name),
    }))
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-1 font-serif text-3xl text-sage-dark">Guide {destination.name}</h1>
      <p className="mb-2 text-sm text-foreground/60">
        {allPlaces.length} lieux · {destination.zones.length} quartiers
      </p>
      <Link
        href={`/guide/${destinationRow.country.slug}/kit`}
        className="mb-8 inline-block text-sm text-sage-dark underline"
      >
        Kit essentiel {destinationRow.country.name} →
      </Link>

      {destination.slug === "bangkok" && (
        <section className="mb-10">
          <p className="mb-5 text-sm leading-relaxed text-foreground/80">
            Bangkok est une ville de contrastes : temples majestueux, quartiers historiques,
            gratte-ciel, marchés animés et street food se côtoient à quelques rues d&apos;intervalle.
            Elle se découvre autant au fil du Chao Phraya que dans ses petites ruelles — mais
            Bangkok est immense, et le secret pour en profiter est de regrouper ses visites par
            quartier plutôt que de traverser la ville dans tous les sens.
          </p>
          <div className="mb-5 rounded border border-line bg-sage-dark/5 px-4 py-3 text-sm text-foreground/80">
            <span className="font-medium text-sage-dark">Little Tip — </span>
            Un hôtel qui paraît proche d&apos;une attraction sur une carte peut en réalité
            nécessiter un long trajet. Privilégiez les stations BTS/MRT, les embarcadères, et
            regroupez vos visites par quartier.
          </div>
          <ZonesMap zones={destination.zones} />
        </section>
      )}

      <GuideSearch places={allPlaces} />

      <nav className="space-y-8">
        {destination.zones.map((zone) => (
          <section key={zone.id}>
            <h2 className="mb-1 flex items-center gap-2 font-serif text-xl text-foreground">
              <ZoneSwatch color={zone.mapColor} />
              {zone.name}
            </h2>
            <p className="mb-3 text-sm text-foreground/60">{zone.vibeText}</p>
            <ul className="divide-y divide-line rounded border border-line bg-ivory">
              {zone.places.map((place) => (
                <li key={place.id}>
                  <Link href={`/lieu/${place.slug}`} className="flex items-center justify-between px-4 py-3 text-sm hover:text-sage-dark">
                    <span>{place.name}</span>
                    <span className="text-xs text-foreground/50">
                      {place.categories.map((c) => c.category.name).join(", ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>
    </main>
  );
}
