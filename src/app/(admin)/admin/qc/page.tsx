import Link from "next/link";
import { prisma } from "@/lib/db";

// A read-only report of content that needs attention — built straight
// from existing fields (no new schema), so it never drifts from what the
// place edit form and publish rule actually require. Grouped by
// destination so content work can be tackled one guide at a time.
export default async function AdminQcPage() {
  const destinations = await prisma.destination.findMany({
    orderBy: { name: "asc" },
    include: {
      places: {
        include: { _count: { select: { photos: true } } },
        orderBy: { name: "asc" },
      },
    },
  });

  return (
    <div>
      <h1 className="mb-2 font-serif text-2xl text-sage-dark">Qualité du contenu</h1>
      <p className="mb-8 text-sm text-foreground/60">
        Ce que chaque destination a encore besoin pour être complète — calculé en direct, rien à tenir à jour
        soi-même.
      </p>

      <div className="space-y-10">
        {destinations.map((dest) => {
          const published = dest.places.filter((p) => p.status === "PUBLISHED");
          const draft = dest.places.filter((p) => p.status !== "PUBLISHED");
          const missingPhoto = dest.places.filter((p) => p._count.photos === 0);
          const missingTip = dest.places.filter((p) => !p.littleTip);
          const missingDuration = dest.places.filter((p) => !p.indicativeDuration);
          const noZone = dest.places.filter((p) => !p.zoneId);

          const issues = [
            { label: "Sans photo", places: missingPhoto },
            { label: "Sans Little Tip", places: missingTip },
            { label: "Sans durée indicative", places: missingDuration },
            { label: "Sans quartier", places: noZone },
            { label: "Non publiés", places: draft },
          ].filter((i) => i.places.length > 0);

          return (
            <section key={dest.id} className="rounded border border-line bg-sand p-5">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="font-serif text-xl text-sage-dark">{dest.name}</h2>
                <p className="text-sm text-foreground/60">
                  {dest.places.length} lieux · {published.length} publiés
                </p>
              </div>

              {issues.length === 0 ? (
                <p className="text-sm text-sage-dark">Rien à signaler — tous les lieux sont complets.</p>
              ) : (
                <div className="space-y-4">
                  {issues.map((issue) => (
                    <details key={issue.label} className="rounded border border-line bg-ivory">
                      <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-foreground/80">
                        {issue.label} <span className="text-foreground/50">({issue.places.length})</span>
                      </summary>
                      <ul className="divide-y divide-line border-t border-line">
                        {issue.places.map((p) => (
                          <li key={p.id} className="px-3 py-1.5 text-sm">
                            <Link href={`/admin/places/${p.id}`} className="text-sage-dark underline">
                              {p.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
