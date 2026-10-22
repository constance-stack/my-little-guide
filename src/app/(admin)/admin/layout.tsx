import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/destinations", label: "Destinations" },
  { href: "/admin/zones", label: "Quartiers" },
  { href: "/admin/categories", label: "Catégories" },
  { href: "/admin/places", label: "Lieux" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/pricing", label: "Tarifs" },
  { href: "/admin/orders", label: "Commandes" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  if (session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="w-56 shrink-0 border-r border-line bg-sand px-4 py-8">
          <p className="mb-6 font-serif text-lg text-sage-dark">My Little Guide</p>
          <nav className="space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded px-3 py-2 text-sm text-foreground/80 hover:bg-ivory hover:text-sage-dark"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
