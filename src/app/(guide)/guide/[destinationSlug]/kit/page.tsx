import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasKit } from "@/lib/entitlements";
import { getKitSections } from "@/content/queries";
import { KitSectionBody } from "@/content/render/kit-section";

// Reuses the [destinationSlug] segment as a country slug (e.g.
// /guide/thailande/kit) — the kit is country-wide, not per-destination,
// but nesting it under the same dynamic segment keeps the URL readable
// without a separate top-level route just for this one page.
export default async function KitPage({ params }: { params: Promise<{ destinationSlug: string }> }) {
  const { destinationSlug: countrySlug } = await params;
  const session = await auth();

  const country = await prisma.country.findUnique({ where: { slug: countrySlug } });
  if (!country) redirect("/");

  if (!session?.user) redirect(`/connexion?callbackUrl=/guide/${countrySlug}/kit`);

  const owns = await hasKit(session.user.id, session.user.role);
  if (!owns) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="mb-4 font-serif text-2xl text-sage-dark">Kit essentiel {country.name}</h1>
        <p className="mb-6 text-sm text-foreground/70">
          Le kit essentiel est inclus automatiquement et gratuitement à l&apos;achat d&apos;une destination.
        </p>
        <Link href={`/pays/${country.slug}`} className="rounded bg-sage-dark px-5 py-2.5 text-sm text-ivory hover:opacity-90">
          Voir les destinations
        </Link>
      </main>
    );
  }

  const sections = await getKitSections(countrySlug);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-1 font-serif text-3xl text-sage-dark">Kit essentiel — {country.name}</h1>
      <p className="mb-8 text-sm text-foreground/60">Conseils pratiques inclus avec chaque destination</p>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.id}>
            <h2 className="mb-2 font-serif text-xl text-foreground">{section.title}</h2>
            <KitSectionBody content={section.content} />
          </section>
        ))}
      </div>
    </main>
  );
}
