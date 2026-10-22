import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updateKitSection } from "./actions";

export default async function AdminKitEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const section = await prisma.kitSection.findUnique({ where: { id }, include: { country: true } });
  if (!section) notFound();

  const action = updateKitSection.bind(null, id);

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 font-serif text-2xl text-sage-dark">{section.title}</h1>
      <p className="mb-6 text-sm text-foreground/60">{section.country.name}</p>

      <form action={action} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-foreground/70" htmlFor="title">
            Titre
          </label>
          <input
            id="title"
            name="title"
            defaultValue={section.title}
            className="w-full rounded border border-line bg-ivory px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-foreground/70" htmlFor="content">
            Contenu
          </label>
          <textarea
            id="content"
            name="content"
            rows={10}
            defaultValue={section.content}
            className="w-full rounded border border-line bg-ivory px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-foreground/70">Statut</label>
          <select name="status" defaultValue={section.status} className="w-full rounded border border-line bg-ivory px-3 py-2 text-sm">
            <option value="DRAFT">Brouillon</option>
            <option value="REVIEW">En relecture</option>
            <option value="PUBLISHED">Publié</option>
          </select>
        </div>
        <button type="submit" className="rounded bg-sage-dark px-4 py-2 text-sm text-ivory hover:opacity-90">
          Enregistrer
        </button>
      </form>
    </div>
  );
}
