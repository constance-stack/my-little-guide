import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { entitledDestinationIds } from "@/lib/entitlements";
import { DeleteAccountButton } from "@/components/account/delete-account-button";

export default async function ComptePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion");
  }

  const [orders, ownedIds] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.user.id },
      include: { lines: { include: { destination: true } }, pdfJobs: true },
      orderBy: { createdAt: "desc" },
    }),
    entitledDestinationIds(session.user.id),
  ]);

  const ownedDestinations = await prisma.destination.findMany({ where: { id: { in: ownedIds } } });

  return (
    <main className="px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 font-serif text-2xl text-sage-dark">Mes guides</h1>
        <p className="mb-6 text-sm text-foreground/60">Connecté en tant que {session.user.email}</p>

        <nav className="mb-8 flex gap-4 text-sm text-sage-dark">
          <Link href="/compte/favoris" className="underline">
            Mes favoris
          </Link>
          <Link href="/compte/itineraire" className="underline">
            Mon itinéraire
          </Link>
          <Link href="/carte" className="underline">
            Ma carte
          </Link>
        </nav>

        {ownedDestinations.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-2 text-sm font-medium text-foreground/70">Mes destinations</h2>
            <div className="flex flex-wrap gap-2">
              {ownedDestinations.map((d) => (
                <Link
                  key={d.id}
                  href={`/guide/${d.slug}`}
                  className="rounded border border-line bg-sand px-3 py-1.5 text-sm hover:border-sage-dark"
                >
                  Guide {d.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {orders.length === 0 ? (
          <p className="text-sm text-foreground/70">Vous n&apos;avez pas encore de commande.</p>
        ) : (
          <ul className="space-y-4">
            {orders.map((order) => (
              <li key={order.id} className="rounded border border-line bg-sand p-4">
                <p className="text-sm text-foreground/60">
                  Commande du {order.createdAt.toLocaleDateString("fr-FR")}
                </p>
                <ul className="mt-2 text-sm">
                  {order.lines.map((line) => (
                    <li key={line.id}>{line.label}</li>
                  ))}
                </ul>
                <PdfStatus pdfJob={order.pdfJobs[0]} />
              </li>
            ))}
          </ul>
        )}

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
          className="mt-10"
        >
          <button type="submit" className="text-sm text-sage-dark underline">
            Se déconnecter
          </button>
        </form>

        <div className="mt-6">
          <DeleteAccountButton />
        </div>
      </div>
    </main>
  );
}

function PdfStatus({ pdfJob }: { pdfJob?: { status: string; storageKey: string | null } }) {
  if (!pdfJob) return null;

  if (pdfJob.status === "DONE" && pdfJob.storageKey) {
    return (
      <a href={`/api/storage/${pdfJob.storageKey}`} className="mt-2 inline-block text-sm text-sage-dark underline">
        Télécharger mon PDF
      </a>
    );
  }

  if (pdfJob.status === "FAILED") {
    return <p className="mt-2 text-sm text-red-700">La génération du PDF a échoué. Contactez-nous pour le régénérer.</p>;
  }

  return <p className="mt-2 text-sm text-foreground/50">Préparation de votre PDF en cours…</p>;
}
