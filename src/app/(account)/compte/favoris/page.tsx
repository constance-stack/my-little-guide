import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FavoriteCategoryPicker } from "@/components/guide/favorite-category-picker";

export default async function FavorisPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion?callbackUrl=/compte/favoris");

  const [favorites, categories] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId: session.user.id },
      include: { place: { include: { destination: true, zone: true } }, category: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ where: { isGlobal: true }, orderBy: { name: "asc" } }),
  ]);

  // Grouped by the favorite's own chosen category (not the place's real
  // categories) — purely for the visitor's own organization. Uncategorized
  // favorites land in their own group, shown last.
  const byCategory = new Map<string, { name: string; icon: string; color: string | null; favorites: typeof favorites }>();
  const UNCATEGORIZED = "__none__";
  for (const fav of favorites) {
    const key = fav.categoryId ?? UNCATEGORIZED;
    if (!byCategory.has(key)) {
      byCategory.set(key, {
        name: fav.category?.name ?? "Sans catégorie",
        icon: fav.category?.icon ?? "star",
        color: fav.category?.color ?? null,
        favorites: [],
      });
    }
    byCategory.get(key)!.favorites.push(fav);
  }
  const groups = Array.from(byCategory.entries()).sort(([a], [b]) => {
    if (a === UNCATEGORIZED) return 1;
    if (b === UNCATEGORIZED) return -1;
    return byCategory.get(a)!.name.localeCompare(byCategory.get(b)!.name);
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 font-serif text-2xl text-sage-dark">Mes favoris</h1>

      {favorites.length === 0 ? (
        <p className="text-sm text-foreground/60">
          Aucun favori pour l&apos;instant. Ajoutez-en depuis le guide ou la carte.
        </p>
      ) : (
        <div className="space-y-8">
          <a
            href="/api/favoris/pdf"
            className="inline-block rounded-xl bg-ivory px-5 py-3 text-sm text-sage-dark shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Télécharger mes favoris en PDF →
          </a>
          <p className="text-xs text-foreground/50">
            Classez vos favoris par catégorie si vous le souhaitez, pour les retrouver plus facilement.
          </p>
          {groups.map(([key, group]) => (
            <section key={key}>
              <h2 className="mb-3 flex items-center gap-2 font-serif text-lg text-foreground">
                {group.color && (
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: group.color }}
                    aria-hidden="true"
                  />
                )}
                {group.name}
              </h2>
              <ul className="space-y-2">
                {group.favorites.map((fav) => (
                  <li
                    key={fav.placeId}
                    className="flex flex-col gap-2 rounded-xl bg-ivory px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <Link href={`/lieu/${fav.place.slug}`} className="hover:text-sage-dark">
                        {fav.place.name}
                      </Link>
                      <span className="block text-xs text-foreground/50">
                        {fav.place.destination.name}
                        {fav.place.zone && ` · ${fav.place.zone.name}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <FavoriteCategoryPicker placeId={fav.placeId} categoryId={fav.categoryId} categories={categories} />
                      <Link
                        href={`/carte?destination=${fav.place.destination.slug}&place=${fav.place.slug}`}
                        className="text-xs text-sage-dark underline"
                      >
                        Voir sur la carte
                      </Link>
                    </div>
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
