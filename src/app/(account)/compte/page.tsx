import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { entitledDestinationIds } from "@/lib/entitlements";
import { DeleteAccountButton } from "@/components/account/delete-account-button";
import { updateAccountEmail, updateAccountPassword } from "./actions";

export default async function ComptePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion");
  }

  const { view } = await searchParams;

  // An admin normally lands on the admin home (below) instead of the
  // customer "Mes guides" page — but still needs a way to see the account
  // exactly as a buyer would (orders, favorites, PDF download) to verify
  // the real customer experience. ?view=client switches back to it.
  if (session.user.role === "ADMIN" && view !== "client") {
    return <AdminHome email={session.user.email ?? ""} />;
  }

  const [orders, ownedIds] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.user.id },
      include: { lines: { include: { destination: true } } },
      orderBy: { createdAt: "desc" },
    }),
    entitledDestinationIds(session.user.id, session.user.role),
  ]);

  const ownedDestinations = await prisma.destination.findMany({ where: { id: { in: ownedIds } } });

  return (
    <main className="px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 font-serif text-2xl text-sage-dark">Mes guides</h1>
        <p className="mb-6 text-sm text-foreground/60">
          Connecté en tant que {session.user.email}
          {session.user.role === "ADMIN" && (
            <>
              {" · "}
              <Link href="/compte" className="underline">
                Retour à l&apos;espace admin
              </Link>
            </>
          )}
        </p>

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
                <a href={`/api/orders/${order.id}/pdf`} className="mt-2 inline-block text-sm text-sage-dark underline">
                  Télécharger mon PDF
                </a>
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


// An admin account isn't a customer — no orders, no favorites, a
// "Mes guides" page would just be empty. /compte shows this instead:
// direct links into the admin sections, not the customer account view.
function AdminHome({ email }: { email: string }) {
  const links = [
    { href: "/admin", label: "Tableau de bord" },
    { href: "/admin/destinations/new", label: "+ Nouvelle destination" },
    { href: "/admin/places", label: "Lieux" },
    { href: "/admin/qc", label: "Qualité du contenu" },
    { href: "/admin/orders", label: "Commandes" },
    { href: "/admin/photos", label: "Photos" },
    { href: "/admin/pricing", label: "Tarifs" },
    { href: "/compte?view=client", label: "Voir mon espace comme un client" },
  ];

  return (
    <main className="px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <p className="mb-1 text-xs uppercase tracking-widest text-sage-dark">Compte administrateur</p>
        <h1 className="mb-2 font-serif text-2xl text-sage-dark">Espace admin</h1>
        <p className="mb-8 text-sm text-foreground/60">Connecté en tant que {email}</p>

        <div className="mb-10 grid gap-3 sm:grid-cols-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded border border-line bg-sand px-4 py-3 text-sm text-foreground/80 hover:border-sage-dark hover:text-sage-dark"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="mb-10 space-y-6 rounded-xl bg-ivory p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-sage-dark">Sécurité du compte</p>

          <form action={updateAccountEmail} className="space-y-2">
            <p className="text-sm font-medium">Changer l&apos;email de connexion</p>
            <input
              type="email"
              name="newEmail"
              required
              placeholder="Nouvel email"
              className="w-full rounded border border-line bg-sand px-3 py-2 text-sm"
            />
            <input
              type="password"
              name="currentPassword"
              required
              placeholder="Mot de passe actuel"
              className="w-full rounded border border-line bg-sand px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded bg-sage-dark px-4 py-2 text-sm text-ivory hover:opacity-90">
              Changer l&apos;email
            </button>
          </form>

          <form action={updateAccountPassword} className="space-y-2 border-t border-line pt-5">
            <p className="text-sm font-medium">Changer le mot de passe</p>
            <input
              type="password"
              name="currentPassword"
              required
              placeholder="Mot de passe actuel"
              className="w-full rounded border border-line bg-sand px-3 py-2 text-sm"
            />
            <input
              type="password"
              name="newPassword"
              required
              minLength={8}
              placeholder="Nouveau mot de passe (8 caractères min.)"
              className="w-full rounded border border-line bg-sand px-3 py-2 text-sm"
            />
            <input
              type="password"
              name="newPasswordConfirm"
              required
              minLength={8}
              placeholder="Confirmer le nouveau mot de passe"
              className="w-full rounded border border-line bg-sand px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded bg-sage-dark px-4 py-2 text-sm text-ivory hover:opacity-90">
              Changer le mot de passe
            </button>
          </form>

          <p className="text-xs text-foreground/50">
            Changer l&apos;email ou le mot de passe vous déconnecte — reconnectez-vous ensuite avec les nouveaux identifiants.
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button type="submit" className="text-sm text-sage-dark underline">
            Se déconnecter
          </button>
        </form>
      </div>
    </main>
  );
}
