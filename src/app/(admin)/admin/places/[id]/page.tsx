import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updatePlace } from "./actions";

export default async function AdminPlaceEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const place = await prisma.place.findUnique({
    where: { id },
    include: { categories: true, photos: true, destination: true },
  });
  if (!place) notFound();

  const [zones, categories, photos] = await Promise.all([
    prisma.zone.findMany({ where: { destinationId: place.destinationId }, orderBy: { name: "asc" } }),
    prisma.category.findMany({
      where: { destinations: { some: { id: place.destinationId } } },
      orderBy: { name: "asc" },
    }),
    prisma.photo.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const selectedCategoryIds = new Set(place.categories.map((c) => c.categoryId));
  const selectedPhotoIds = new Set(place.photos.map((p) => p.photoId));
  const action = updatePlace.bind(null, id);

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 font-serif text-2xl text-sage-dark">{place.name}</h1>
      <p className="mb-6 text-sm text-foreground/60">{place.destination.name}</p>

      <form action={action} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Nom" name="name" defaultValue={place.name} />
          <TextField label="Slug" name="slug" defaultValue={place.slug} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm text-foreground/70">Statut</label>
            <select name="status" defaultValue={place.status} className="w-full rounded border border-line bg-ivory px-3 py-2 text-sm">
              <option value="DRAFT">Brouillon</option>
              <option value="REVIEW">En relecture</option>
              <option value="PUBLISHED">Publié</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-foreground/70">Quartier</label>
            <select name="zoneId" defaultValue={place.zoneId ?? ""} className="w-full rounded border border-line bg-ivory px-3 py-2 text-sm">
              <option value="">—</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm text-foreground/70">
            <input type="checkbox" name="isFictionalDemo" defaultChecked={place.isFictionalDemo} />
            Lieu fictif (démo)
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextField label="Latitude" name="lat" defaultValue={place.lat.toString()} />
          <TextField label="Longitude" name="lng" defaultValue={place.lng.toString()} />
        </div>

        <TextArea label="Description" name="description" defaultValue={place.description} rows={4} />
        <TextArea label="Pourquoi visiter" name="whyVisit" defaultValue={place.whyVisit} rows={2} />
        <TextArea label="Little Tip" name="littleTip" defaultValue={place.littleTip ?? ""} rows={2} />

        <div className="grid grid-cols-2 gap-3">
          <TextField label="Prix indicatif" name="indicativePrice" defaultValue={place.indicativePrice ?? ""} />
          <TextField label="Durée indicative" name="indicativeDuration" defaultValue={place.indicativeDuration ?? ""} />
          <TextField label="Horaires" name="officialHours" defaultValue={place.officialHours ?? ""} />
          <TextField label="Lien officiel" name="officialUrl" defaultValue={place.officialUrl ?? ""} />
        </div>

        <div>
          <p className="mb-2 text-sm text-foreground/70">Catégories</p>
          <div className="grid grid-cols-2 gap-1">
            {categories.map((cat) => (
              <label key={cat.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="categoryIds" value={cat.id} defaultChecked={selectedCategoryIds.has(cat.id)} />
                {cat.name}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm text-foreground/70">
            Photos <span className="text-xs text-foreground/50">(une photo doit avoir l&apos;usage commercial vérifié pour publier)</span>
          </p>
          <div className="grid grid-cols-2 gap-1">
            {photos.map((photo) => (
              <label key={photo.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="photoIds" value={photo.id} defaultChecked={selectedPhotoIds.has(photo.id)} />
                {photo.altText} {!photo.commercialOk && <span className="text-red-700">(non vérifiée)</span>}
              </label>
            ))}
          </div>
        </div>

        <button type="submit" className="rounded bg-sage-dark px-4 py-2 text-sm text-ivory hover:opacity-90">
          Enregistrer
        </button>
      </form>
    </div>
  );
}

function TextField({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-foreground/70" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} defaultValue={defaultValue} className="w-full rounded border border-line bg-ivory px-3 py-2 text-sm" />
    </div>
  );
}

function TextArea({ label, name, defaultValue, rows }: { label: string; name: string; defaultValue: string; rows: number }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-foreground/70" htmlFor={name}>
        {label}
      </label>
      <textarea id={name} name={name} rows={rows} defaultValue={defaultValue} className="w-full rounded border border-line bg-ivory px-3 py-2 text-sm" />
    </div>
  );
}
