import { prisma } from "@/lib/db";
import { toggleCategoryForDestination } from "./actions";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ destination?: string }>;
}) {
  const { destination: destinationIdParam } = await searchParams;

  const [destinations, categories] = await Promise.all([
    prisma.destination.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { destinations: { select: { id: true } } },
    }),
  ]);

  const destination = destinations.find((d) => d.id === destinationIdParam) ?? destinations[0];

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 font-serif text-2xl text-sage-dark">Catégories</h1>
      <p className="mb-6 text-sm text-foreground/60">
        Taxonomie globale. Une catégorie n&apos;est activée que pour les destinations où elle a du sens —
        ne pas cocher une catégorie qui ne correspond pas à la destination.
      </p>

      <div className="mb-4 flex gap-2">
        {destinations.map((d) => (
          <a
            key={d.id}
            href={`/admin/categories?destination=${d.id}`}
            className={`rounded px-3 py-1.5 text-sm ${
              destination?.id === d.id ? "bg-sage-dark text-ivory" : "bg-sand text-foreground/70"
            }`}
          >
            {d.name}
          </a>
        ))}
      </div>

      {destination && (
        <ul className="divide-y divide-line">
          {categories.map((cat) => {
            const enabled = cat.destinations.some((d) => d.id === destination.id);
            return (
              <li key={cat.id} className="flex items-center justify-between py-2">
                <span className="text-sm">{cat.name}</span>
                <form action={toggleCategoryForDestination}>
                  <input type="hidden" name="destinationId" value={destination.id} />
                  <input type="hidden" name="categoryId" value={cat.id} />
                  <input type="hidden" name="enabled" value={(!enabled).toString()} />
                  <button
                    type="submit"
                    className={`rounded px-3 py-1 text-xs ${
                      enabled ? "bg-sage-dark text-ivory" : "border border-line text-foreground/50"
                    }`}
                  >
                    {enabled ? "Activée" : "Désactivée"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
