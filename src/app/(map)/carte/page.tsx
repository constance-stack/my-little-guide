import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MapPageClient } from "@/components/map/map-page-client";

export default async function CartePage({
  searchParams,
}: {
  searchParams: Promise<{ destination?: string; place?: string; cat?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/connexion?callbackUrl=/carte");

  const { destination, place, cat } = await searchParams;

  return (
    <MapPageClient
      initialDestinationSlug={destination ?? null}
      initialPlaceSlug={place ?? null}
      initialCategorySlug={cat ?? null}
    />
  );
}
