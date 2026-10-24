import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasAccess } from "@/lib/entitlements";
import { getDestinationForGuide } from "@/content/queries";
import { GuideSearch } from "@/components/guide/guide-search";
import { ZonesMap, ZoneSwatch, hasZonesMapLayout } from "@/content/render/zones-map";

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
        className="mb-6 inline-block text-sm text-sage-dark underline"
      >
        Kit essentiel {destinationRow.country.name} →
      </Link>

      <Link
        href={`/carte?destination=${destination.slug}`}
        className="mb-8 flex items-center justify-between rounded border border-line bg-sand px-5 py-4 transition hover:border-sage-dark"
      >
        <span>
          <span className="block font-serif text-lg text-sage-dark">Voir la carte</span>
          <span className="block text-sm text-foreground/60">
            Repérez les lieux sur la carte interactive, ou parcourez la liste ci-dessous.
          </span>
        </span>
        <span className="text-sage-dark">→</span>
      </Link>

      {destination.slug === "koh-tao" && (
        <section className="mb-10">
          <p className="mb-5 text-sm leading-relaxed text-foreground/80">
            Koh Tao n&apos;a pas d&apos;aéroport : on y arrive uniquement en bateau. La route la plus directe passe
            par Chumphon, sur le continent, rejoint en train, bus ou avion depuis Bangkok, puis en ferry jusqu&apos;à
            l&apos;île (comptez environ 1h30 à 2h de traversée selon le bateau). L&apos;autre option classique est de
            combiner Koh Tao avec Koh Phangan et Koh Samui dans un même séjour : l&apos;aéroport de Koh Samui, bien
            desservi depuis Bangkok, est alors le point d&apos;entrée, suivi d&apos;un ferry remontant vers Koh Tao en
            passant par les deux autres îles.
          </p>
          <div className="mb-5 rounded border border-line bg-sage-dark/5 px-4 py-3 text-sm text-foreground/80">
            <span className="font-medium text-sage-dark">Little Tip — </span>
            Koh Tao est petite mais vallonnée : un scooter est pratique pour la côte est et les points de vue, mais
            certaines routes sont pentues et sinueuses. Beaucoup de visiteurs se déplacent aussi très bien à pied ou
            en taxi partagé entre Sairee et Mae Haad.
          </div>
        </section>
      )}

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
          <ZonesMap zones={destination.zones} destinationSlug={destination.slug} />
        </section>
      )}

      {destination.slug === "new-york" && (
        <section className="mb-10">
          <p className="mb-5 text-sm leading-relaxed text-foreground/80">
            New York se visite très bien à pied dans chaque quartier, mais se déplacer d&apos;un bout à l&apos;autre
            de la ville demande presque toujours le métro — il fonctionne 24h/24 et reste le moyen le plus rapide
            d&apos;éviter les embouteillages. Manhattan s&apos;étire du nord au sud sur près de 20 km : mieux vaut
            regrouper ses visites par quartier plutôt que d&apos;essayer de zigzaguer, et ne pas sous-estimer les
            distances entre Manhattan, Brooklyn, le Queens et le Bronx.
          </p>
          <div className="mb-5 rounded border border-line bg-sage-dark/5 px-4 py-3 text-sm text-foreground/80">
            <span className="font-medium text-sage-dark">Little Tip — </span>
            Le paiement du métro se fait directement par carte bancaire ou smartphone sans contact (OMNY) à chaque
            tourniquet — pas besoin d&apos;acheter de ticket à l&apos;avance.
          </div>
          {hasZonesMapLayout(destination.slug) && (
            <ZonesMap zones={destination.zones} destinationSlug={destination.slug} />
          )}
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
                  <Link href={`/lieu/${place.slug}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:text-sage-dark">
                    <span className="flex items-center gap-2">
                      {place.name}
                      {place.indicativePrice && (
                        <span className="rounded bg-sage-dark/10 px-1.5 py-0.5 text-xs font-medium text-sage-dark">
                          {place.indicativePrice}
                        </span>
                      )}
                    </span>
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
