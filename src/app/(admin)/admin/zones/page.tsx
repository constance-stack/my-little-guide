import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function AdminZonesPage() {
  const zones = await prisma.zone.findMany({
    include: { destination: true, _count: { select: { places: true } } },
    orderBy: [{ destination: { name: "asc" } }, { name: "asc" }],
  });

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-sage-dark">Quartiers / zones</h1>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-foreground/60">
            <th className="py-2">Nom</th>
            <th className="py-2">Destination</th>
            <th className="py-2">Lieux</th>
          </tr>
        </thead>
        <tbody>
          {zones.map((z) => (
            <tr key={z.id} className="border-b border-line/60">
              <td className="py-2">
                <Link href={`/admin/zones/${z.id}`} className="text-sage-dark underline">
                  {z.name}
                </Link>
              </td>
              <td className="py-2">{z.destination.name}</td>
              <td className="py-2">{z._count.places}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
