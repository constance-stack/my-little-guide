import Link from "next/link";
import { prisma } from "@/lib/db";
import type { PublishStatus } from "@/generated/prisma/enums";

const PAGE_SIZE = 50;

export default async function AdminPlacesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    destination?: string;
    category?: string;
    status?: string;
    missingPhoto?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const destinationId = sp.destination ?? "";
  const categoryId = sp.category ?? "";
  const status = sp.status ?? "";
  const missingPhoto = sp.missingPhoto === "1";
  const page = Math.max(1, Number(sp.page) || 1);

  const where = {
    ...(q && { name: { contains: q, mode: "insensitive" as const } }),
    ...(destinationId && { destinationId }),
    ...(status && { status: status as PublishStatus }),
    ...(categoryId && { categories: { some: { categoryId } } }),
    ...(missingPhoto && { photos: { none: {} } }),
  };

  const [places, total, destinations, categories] = await Promise.all([
    prisma.place.findMany({
      where,
      include: { destination: true, zone: true, _count: { select: { photos: true } } },
      orderBy: [{ destination: { name: "asc" } }, { name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.place.count({ where }),
    prisma.destination.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Builds a query string for pagination links that preserves every
  // active filter — only the `page` param changes.
  function pageHref(n: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (destinationId) params.set("destination", destinationId);
    if (categoryId) params.set("category", categoryId);
    if (status) params.set("status", status);
    if (missingPhoto) params.set("missingPhoto", "1");
    if (n > 1) params.set("page", String(n));
    const qs = params.toString();
    return qs ? `/admin/places?${qs}` : "/admin/places";
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl text-sage-dark">Lieux</h1>
        <p className="text-sm text-foreground/60">{total} résultat{total > 1 ? "s" : ""}</p>
      </div>

      <form className="mb-6 grid grid-cols-2 gap-3 rounded border border-line bg-sand p-4 sm:grid-cols-5">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Rechercher un nom…"
          className="col-span-2 rounded border border-line bg-ivory px-3 py-2 text-sm sm:col-span-1"
        />
        <select name="destination" defaultValue={destinationId} className="rounded border border-line bg-ivory px-3 py-2 text-sm">
          <option value="">Toutes les destinations</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select name="category" defaultValue={categoryId} className="rounded border border-line bg-ivory px-3 py-2 text-sm">
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status} className="rounded border border-line bg-ivory px-3 py-2 text-sm">
          <option value="">Tous les statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="REVIEW">En relecture</option>
          <option value="PUBLISHED">Publié</option>
        </select>
        <label className="flex items-center gap-2 rounded border border-line bg-ivory px-3 py-2 text-sm text-foreground/70">
          <input type="checkbox" name="missingPhoto" value="1" defaultChecked={missingPhoto} />
          Sans photo
        </label>
        <button type="submit" className="col-span-2 rounded bg-sage-dark px-3 py-2 text-sm text-ivory hover:opacity-90 sm:col-span-5">
          Filtrer
        </button>
      </form>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-foreground/60">
            <th className="py-2">Nom</th>
            <th className="py-2">Destination</th>
            <th className="py-2">Quartier</th>
            <th className="py-2">Statut</th>
            <th className="py-2">Photo</th>
            <th className="py-2">Fictif</th>
          </tr>
        </thead>
        <tbody>
          {places.map((p) => (
            <tr key={p.id} className="border-b border-line/60">
              <td className="py-2">
                <Link href={`/admin/places/${p.id}`} className="text-sage-dark underline">
                  {p.name}
                </Link>
              </td>
              <td className="py-2">{p.destination.name}</td>
              <td className="py-2">{p.zone?.name ?? "—"}</td>
              <td className="py-2">{p.status}</td>
              <td className="py-2">{p._count.photos > 0 ? "Oui" : <span className="text-amber-700">Non</span>}</td>
              <td className="py-2">{p.isFictionalDemo ? "Oui" : "Non"}</td>
            </tr>
          ))}
          {places.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-foreground/50">
                Aucun lieu ne correspond à ces filtres.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <Link
            href={pageHref(Math.max(1, page - 1))}
            className={`text-sage-dark underline ${page <= 1 ? "pointer-events-none opacity-30" : ""}`}
          >
            ← Précédent
          </Link>
          <span className="text-foreground/60">
            Page {page} / {totalPages}
          </span>
          <Link
            href={pageHref(Math.min(totalPages, page + 1))}
            className={`text-sage-dark underline ${page >= totalPages ? "pointer-events-none opacity-30" : ""}`}
          >
            Suivant →
          </Link>
        </div>
      )}
    </div>
  );
}
