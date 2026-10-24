import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function FavorisPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion?callbackUrl=/compte/favoris");

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    include: { place: { include: { destination: true, zone: true } } },
    orderBy: { createdAt: "desc" },
  });

  const byDestination = new Map<string, { name: string; places: typeof favorites }>();
  for (const fav of favorites) {
    const key = fav.place.destination.slug;
    if (!byDestination.has(key)) byDestination.set(key, { name: fav.place.destination.name, places: [] });
    byDestination.get(key)!.places.push(fav);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 font-serif text-2xl text-sage-dark">Mes favoris</h1>

      {favorites.length === 0 ? (
        <p className="text-sm text-foreground/60">
          Aucun favori pour l&apos;instant. Ajoutez-en depuis le guide ou la carte.
        </p>
      ) : (
        <div className="space-y-8">
          {Array.from(byDestination.entries()).map(([slug, group]) => (
            <section key={slug}>
              <h2 className="mb-3 font-serif text-lg text-foreground">{group.name}</h2>
              <ul className="space-y-2">
                {group.places.map((fav) => (
                  <li key={fav.placeId} className="flex items-center justify-between rounded-xl bg-ivory px-4 py-3 text-sm shadow-sm">
                    <div>
                      <Link href={`/lieu/${fav.place.slug}`} className="hover:text-sage-dark">
                        {fav.place.name}
                      </Link>
                      {fav.place.zone && <span className="block text-xs text-foreground/50">{fav.place.zone.name}</span>}
                    </div>
                    <Link
                      href={`/carte?destination=${slug}&place=${fav.place.slug}`}
                      className="text-xs text-sage-dark underline"
                    >
                      Voir sur la carte
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
