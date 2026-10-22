import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updateDestination } from "./actions";

export default async function AdminDestinationEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const destination = await prisma.destination.findUnique({ where: { id } });
  if (!destination) notFound();

  const action = updateDestination.bind(null, id);

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 font-serif text-2xl text-sage-dark">{destination.name}</h1>
      <form action={action} className="space-y-4">
        <Field label="Nom" name="name" defaultValue={destination.name} />
        <Field label="Slug" name="slug" defaultValue={destination.slug} />
        <div>
          <label className="mb-1 block text-sm text-foreground/70">Statut</label>
          <select
            name="status"
            defaultValue={destination.status}
            className="w-full rounded border border-line bg-ivory px-3 py-2 text-sm"
          >
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

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-foreground/70" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded border border-line bg-ivory px-3 py-2 text-sm outline-none focus:border-sage-dark"
      />
    </div>
  );
}
