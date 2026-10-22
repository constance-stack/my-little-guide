import { prisma } from "@/lib/db";

export default async function AdminHomePage() {
  const [destinations, places, orders, unverifiedPhotos] = await Promise.all([
    prisma.destination.count(),
    prisma.place.count(),
    prisma.order.count(),
    prisma.photo.count({ where: { commercialOk: false } }),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-sage-dark">Tableau de bord</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Destinations" value={destinations} />
        <Stat label="Lieux" value={places} />
        <Stat label="Commandes" value={orders} />
        <Stat label="Photos non validées" value={unverifiedPhotos} warn={unverifiedPhotos > 0} />
      </div>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded border border-line bg-sand p-4">
      <p className={`text-2xl font-serif ${warn ? "text-red-700" : "text-sage-dark"}`}>{value}</p>
      <p className="text-sm text-foreground/60">{label}</p>
    </div>
  );
}
