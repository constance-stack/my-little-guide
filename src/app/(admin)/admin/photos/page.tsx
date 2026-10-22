import { prisma } from "@/lib/db";
import { uploadPhoto } from "./actions";

export default async function AdminPhotosPage() {
  const photos = await prisma.photo.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 font-serif text-2xl text-sage-dark">Photos</h1>

      <form action={uploadPhoto} className="mb-10 space-y-3 rounded border border-line bg-sand p-4">
        <p className="text-sm font-medium">Ajouter une photo</p>
        <input type="file" name="file" accept="image/*" required className="text-sm" />
        <div className="grid grid-cols-2 gap-3">
          <input name="photographer" placeholder="Photographe" required className="rounded border border-line bg-ivory px-3 py-2 text-sm" />
          <input name="sourceName" placeholder="Source" required className="rounded border border-line bg-ivory px-3 py-2 text-sm" />
          <input name="sourceUrl" placeholder="URL d'origine" className="rounded border border-line bg-ivory px-3 py-2 text-sm" />
          <input name="licenseType" placeholder="Type de licence" required className="rounded border border-line bg-ivory px-3 py-2 text-sm" />
        </div>
        <input name="altText" placeholder="Texte alternatif" required className="w-full rounded border border-line bg-ivory px-3 py-2 text-sm" />
        <label className="flex items-center gap-2 text-sm text-foreground/70">
          <input type="checkbox" name="commercialOk" />
          Usage commercial vérifié (nécessaire pour publier un lieu utilisant cette photo)
        </label>
        <button type="submit" className="rounded bg-sage-dark px-4 py-2 text-sm text-ivory hover:opacity-90">
          Téléverser
        </button>
      </form>

      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
        {photos.map((photo) => (
          <div key={photo.id} className="rounded border border-line bg-sand p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.storageKey} alt={photo.altText} className="mb-2 h-24 w-full rounded object-cover" />
            <p className="truncate text-xs text-foreground/70">{photo.photographer}</p>
            <p className={`text-xs ${photo.commercialOk ? "text-sage-dark" : "text-red-700"}`}>
              {photo.commercialOk ? "Usage commercial OK" : "Non vérifiée"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
