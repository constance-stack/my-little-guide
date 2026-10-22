import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function AdminKitPage() {
  const sections = await prisma.kitSection.findMany({
    include: { country: true },
    orderBy: [{ country: { name: "asc" } }, { sortOrder: "asc" }],
  });

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-sage-dark">Kit essentiel</h1>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-foreground/60">
            <th className="py-2">Titre</th>
            <th className="py-2">Pays</th>
            <th className="py-2">Statut</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((s) => (
            <tr key={s.id} className="border-b border-line/60">
              <td className="py-2">
                <Link href={`/admin/kit/${s.id}`} className="text-sage-dark underline">
                  {s.title}
                </Link>
              </td>
              <td className="py-2">{s.country.name}</td>
              <td className="py-2">{s.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
