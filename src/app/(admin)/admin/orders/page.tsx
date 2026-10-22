import { prisma } from "@/lib/db";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    include: { user: true, lines: true, pdfJobs: true, emailJobs: true },
    orderBy: { createdAt: "desc" },
  });

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
              <th className="py-2">PDF</th>
              <th className="py-2">E-mail</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-line/60">
                <td className="py-2">{order.createdAt.toLocaleString("fr-FR")}</td>
                <td className="py-2">{order.user.email}</td>
                <td className="py-2">
                  {(order.amountCents / 100).toFixed(2)} {order.currency}
                </td>
                <td className="py-2">{order.status}</td>
                <td className="py-2">{order.pdfJobs[0]?.status ?? "—"}</td>
                <td className="py-2">{order.emailJobs[0]?.status ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
