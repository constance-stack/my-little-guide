import { prisma } from "@/lib/db";
import { createDestinationRequest, updateDestinationRequestStatus, deleteDestinationRequest } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  IN_PROGRESS: "En cours",
  DONE: "Terminée",
};

// Not a button that calls an AI server-side: fulfilling a destination
// means real research, licensed photos and written content (the same
// process used for Bangkok and Chiang Mai), which needs a working
// session, not an unsupervised generation step. This queues the request
// instead — picked up and built from an actual conversation, same
// quality bar as every destination so far.
export default async function NewDestinationRequestPage() {
  const requests = await prisma.destinationRequest.findMany({
    include: { requestedBy: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 font-serif text-2xl text-sage-dark">Demander une nouvelle destination</h1>
      <p className="mb-6 text-sm text-foreground/60">
        Décrivez la destination voulue — elle est construite dans une session de travail (recherche, photos sous
        licence, rédaction), pas générée automatiquement sans relecture.
      </p>

      <form action={createDestinationRequest} className="mb-10 space-y-4 rounded border border-line bg-sand p-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-foreground/70" htmlFor="countryName">
              Pays
            </label>
            <input
              id="countryName"
              name="countryName"
              required
              placeholder="Ex. Thaïlande"
              className="w-full rounded border border-line bg-ivory px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-foreground/70" htmlFor="destinationName">
              Destination
            </label>
            <input
              id="destinationName"
              name="destinationName"
              required
              placeholder="Ex. Phuket"
              className="w-full rounded border border-line bg-ivory px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-foreground/70" htmlFor="targetPlaceCount">
            Nombre de lieux visé <span className="text-foreground/50">(optionnel)</span>
          </label>
          <input
            id="targetPlaceCount"
            name="targetPlaceCount"
            type="number"
            min={1}
            placeholder="Ex. 80"
            className="w-40 rounded border border-line bg-ivory px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-foreground/70" htmlFor="notes">
            Notes <span className="text-foreground/50">(optionnel — quartiers à privilégier, particularités…)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="w-full rounded border border-line bg-ivory px-3 py-2 text-sm"
          />
        </div>

        <button type="submit" className="rounded bg-sage-dark px-4 py-2 text-sm text-ivory hover:opacity-90">
          Envoyer la demande
        </button>
      </form>

      <h2 className="mb-3 font-serif text-lg text-sage-dark">Demandes</h2>
      <ul className="divide-y divide-line rounded border border-line bg-ivory">
        {requests.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">
                {r.destinationName} <span className="text-foreground/50">— {r.countryName}</span>
              </p>
              <p className="text-xs text-foreground/50">
                {r.targetPlaceCount ? `${r.targetPlaceCount} lieux visés · ` : ""}
                demandé {r.requestedBy?.email ? `par ${r.requestedBy.email} ` : ""}
                le {r.createdAt.toLocaleDateString("fr-FR")}
                {r.notes ? ` · ${r.notes}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <form action={updateDestinationRequestStatus.bind(null, r.id, r.status === "DONE" ? "PENDING" : r.status === "PENDING" ? "IN_PROGRESS" : "DONE")}>
                <button
                  type="submit"
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    r.status === "DONE"
                      ? "bg-sage-dark text-ivory"
                      : r.status === "IN_PROGRESS"
                        ? "bg-amber-600 text-ivory"
                        : "border border-line text-foreground/70"
                  }`}
                >
                  {STATUS_LABEL[r.status]}
                </button>
              </form>
              <form action={deleteDestinationRequest.bind(null, r.id)}>
                <button type="submit" className="text-xs text-foreground/40 hover:text-red-700">
                  Supprimer
                </button>
              </form>
            </div>
          </li>
        ))}
        {requests.length === 0 && <li className="px-4 py-6 text-center text-sm text-foreground/50">Aucune demande pour le moment.</li>}
      </ul>
    </div>
  );
}
