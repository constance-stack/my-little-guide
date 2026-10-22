import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updateZone } from "./actions";

const TEXT_AREAS: { name: string; label: string }[] = [
  { name: "vibeText", label: "Ambiance" },
  { name: "prosText", label: "Avantages" },
  { name: "consText", label: "Inconvénients" },
  { name: "transportText", label: "Transports" },
  { name: "nearbyText", label: "Visites accessibles" },
  { name: "profileFitText", label: "Profil de voyageur" },
  { name: "hotelAdviceText", label: "Conseils d'hébergement" },
];

export default async function AdminZoneEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const zone = await prisma.zone.findUnique({ where: { id }, include: { destination: true } });
  if (!zone) notFound();

  const action = updateZone.bind(null, id);

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 font-serif text-2xl text-sage-dark">{zone.name}</h1>
      <p className="mb-6 text-sm text-foreground/60">{zone.destination.name}</p>
      <form action={action} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-foreground/70" htmlFor="name">
            Nom
          </label>
          <input
            id="name"
            name="name"
            defaultValue={zone.name}
            className="w-full rounded border border-line bg-ivory px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-foreground/70" htmlFor="mapColor">
            Couleur sur la carte (hex)
          </label>
          <input
            id="mapColor"
            name="mapColor"
            defaultValue={zone.mapColor}
            className="w-full rounded border border-line bg-ivory px-3 py-2 text-sm"
          />
        </div>
        {TEXT_AREAS.map(({ name, label }) => (
          <div key={name}>
            <label className="mb-1 block text-sm text-foreground/70" htmlFor={name}>
              {label}
            </label>
            <textarea
              id={name}
              name={name}
              rows={3}
              defaultValue={(zone as unknown as Record<string, string>)[name]}
              className="w-full rounded border border-line bg-ivory px-3 py-2 text-sm"
            />
          </div>
        ))}
        <button type="submit" className="rounded bg-sage-dark px-4 py-2 text-sm text-ivory hover:opacity-90">
          Enregistrer
        </button>
      </form>
    </div>
  );
}
