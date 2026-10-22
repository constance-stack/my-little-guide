import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPlaceForGuide } from "@/content/queries";
import { PlaceDetail } from "@/content/render/place-detail";
import { FavoriteButton } from "@/components/guide/favorite-button";

export default async function LieuPage({ params }: { params: Promise<{ placeSlug: string }> }) {
  const { placeSlug } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/connexion?callbackUrl=/lieu/${placeSlug}`);

  const place = await getPlaceForGuide(placeSlug, session.user.id, session.user.role);
  if (!place) notFound();

  const favorite = await prisma.favorite.findUnique({
    where: { userId_placeId: { userId: session.user.id, placeId: place.id } },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link href={`/guide/${place.destination.slug}`} className="mb-6 inline-block text-sm text-sage-dark underline">
        ← Retour au guide {place.destination.name}
      </Link>

      <PlaceDetail place={place} />

      <div className="mt-6 flex gap-3">
        <FavoriteButton placeId={place.id} initialIsFavorite={favorite !== null} />
        <Link
          href={`/carte?destination=${place.destination.slug}&place=${place.slug}`}
          className="rounded border border-line px-4 py-2 text-sm text-foreground/70 hover:border-sage-dark"
        >
          Voir sur ma carte
        </Link>
      </div>
    </main>
  );
}
