import { prisma } from "@/lib/db";
import { regenerateCountryPdf } from "./actions";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    include: { user: true, lines: { include: { destination: { include: { country: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  // PDFs are per (user, country) now, not per order — a customer's guide
  // for a country combines every destination they own there, possibly
  // across several orders. Fetch every CountryPdfJob once, keyed for
  // quick lookup per order row below instead of re-querying per order.
  const countryPdfJobs = await prisma.countryPdfJob.findMany();
  const jobByUserCountry = new Map(countryPdfJobs.map((j) => [`${j.userId}:${j.countryId}`, j]));

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl text-sage-dark">Commandes</h1>
      {orders.length === 0 ? (
        <p className="text-sm text-foreground/60">Aucune commande pour l&apos;instant.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-foreground/60">
              <th className="py-2">Date</th>
              <th className="py-2">Client</th>
              <th className="py-2">Montant</th>
              <th className="py-2">Statut</th>
              <th className="py-2">PDF par pays</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const countries = Array.from(
                new Map(
                  order.lines
                    .map((l) => l.destination?.country)
                    .filter((c): c is NonNullable<typeof c> => Boolean(c))
                    .map((c) => [c.id, c])
                ).values()
              );
              return (
                <tr key={order.id} className="border-b border-line/60">
                  <td className="py-2 align-top">{order.createdAt.toLocaleString("fr-FR")}</td>
                  <td className="py-2 align-top">{order.user.email}</td>
                  <td className="py-2 align-top">
                    {(order.amountCents / 100).toFixed(2)} {order.currency}
                  </td>
                  <td className="py-2 align-top">{order.status}</td>
                  <td className="py-2 align-top">
                    <div className="space-y-2">
                      {countries.map((country) => {
                        const job = jobByUserCountry.get(`${order.userId}:${country.id}`);
                        const regenerate = regenerateCountryPdf.bind(null, order.userId, country.id);
                        return (
                          <div key={country.id} className="flex items-center gap-3">
                            <span className="w-24 text-xs text-foreground/70">{country.name}</span>
                            <span className="text-xs">{job?.status ?? "—"}</span>
                            <a
                              href={`/api/compte/pdf/${country.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-sage-dark underline"
                            >
                              Voir le PDF
                            </a>
                            <form action={regenerate}>
                              <button type="submit" className="text-xs text-sage-dark underline">
                                Forcer la régénération
                              </button>
                            </form>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
