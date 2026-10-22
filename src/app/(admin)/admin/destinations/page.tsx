import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function AdminDestinationsPage() {
  const destinations = await prisma.destination.findMany({
    include: { country: true, _count: { select: { places: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-sage-dark">Destinations</h1>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-foreground/60">
            <th className="py-2">Nom</th>
            <th className="py-2">Pays</th>
            <th className="py-2">Type</th>
            <th className="py-2">Taille</th>
            <th className="py-2">Statut</th>
            <th className="py-2">Lieux</th>
          </tr>
        </thead>
        <tbody>
          {destinations.map((d) => (
            <tr key={d.id} className="border-b border-line/60">
              <td className="py-2">
                <Link href={`/admin/destinations/${d.id}`} className="text-sage-dark underline">
                  {d.name}
                </Link>
              </td>
              <td className="py-2">{d.country.name}</td>
              <td className="py-2">{d.kind}</td>
              <td className="py-2">{d.size}</td>
              <td className="py-2">
                <StatusBadge status={d.status} />
              </td>
              <td className="py-2">{d._count.places}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "PUBLISHED" ? "text-sage-dark" : status === "REVIEW" ? "text-amber-700" : "text-foreground/50";
  return <span className={color}>{status}</span>;
}
