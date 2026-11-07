import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ItineraireClient } from "./itineraire-client";

export default async function ItinerairePage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion?callbackUrl=/compte/itineraire");

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 font-serif text-2xl text-sage-dark">Mon itinéraire</h1>
      <a
        href="/api/itineraire/pdf"
        className="mb-6 inline-block rounded-xl bg-ivory px-5 py-3 text-sm text-sage-dark shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        Télécharger mon itinéraire en PDF →
      </a>
      <ItineraireClient />
    </main>
  );
}
