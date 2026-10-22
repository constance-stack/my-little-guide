import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ComptePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/connexion");
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: { lines: { include: { destination: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 font-serif text-2xl text-sage-dark">Mes guides</h1>
        <p className="mb-8 text-sm text-foreground/60">Connecté en tant que {session.user.email}</p>

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
      </div>
    </main>
  );
}
