import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function AdminPlacesPage() {
  const places = await prisma.place.findMany({
    include: { destination: true, zone: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-sage-dark">Lieux</h1>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-foreground/60">
            <th className="py-2">Nom</th>
            <th className="py-2">Destination</th>
            <th className="py-2">Quartier</th>
            <th className="py-2">Statut</th>
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
              <td className="py-2">{p.isFictionalDemo ? "Oui" : "Non"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
