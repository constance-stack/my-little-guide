import { MapPageClient } from "@/components/map/map-page-client";

// The free, public map demo — no login, no purchase. Shows the real map
// UI against the fixed DEMO_BANGKOK_SLUGS list (see src/lib/demo.ts) so a
// visitor sees the actual product, not a mockup.
export default async function CarteDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ place?: string; cat?: string }>;
}) {
  const { place, cat } = await searchParams;

  return (
    <MapPageClient
      demo
      initialDestinationSlug={null}
      initialPlaceSlug={place ?? null}
      initialCategorySlug={cat ?? null}
    />
  );
}
