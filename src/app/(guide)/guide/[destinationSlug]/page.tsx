import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasAccess } from "@/lib/entitlements";
import { getDestinationForGuide } from "@/content/queries";
import { GuideSearch } from "@/components/guide/guide-search";

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

      <GuideSearch places={allPlaces} />

      <nav className="space-y-8">
        {destination.zones.map((zone) => (
          <section key={zone.id}>
            <h2 className="mb-1 font-serif text-xl text-foreground">{zone.name}</h2>
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
