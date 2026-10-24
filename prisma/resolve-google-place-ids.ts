/**
 * One-time batch resolution: for every PUBLISHED place with no real
 * Wikimedia photo and no googlePlaceId yet, looks up a matching Google
 * place_id via Text Search (New) and stores it — never a photo itself,
 * see src/lib/google-places.ts for why only the ID is persisted.
 *
 * Usage: GOOGLE_PLACES_API_KEY=... npx tsx prisma/resolve-google-place-ids.ts [destinationSlug]
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { findGooglePlaceId } from "../src/lib/google-places";

const isRemote = !process.env.DATABASE_URL?.includes("localhost");
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error("GOOGLE_PLACES_API_KEY is not set — aborting.");
    process.exit(1);
  }

  const destinationSlug = process.argv[2];

  const places = await prisma.place.findMany({
    where: {
      status: "PUBLISHED",
      googlePlaceId: null,
      photos: { none: {} },
      ...(destinationSlug ? { destination: { slug: destinationSlug } } : {}),
    },
    include: { destination: true },
  });

  console.log(`Resolving Google place_id for ${places.length} places without a photo…`);

  let found = 0;
  for (const place of places) {
    const query = `${place.name}, ${place.destination.name}, Thaïlande`;
    const googlePlaceId = await findGooglePlaceId(query, Number(place.lat), Number(place.lng));
    if (googlePlaceId) {
      await prisma.place.update({ where: { id: place.id }, data: { googlePlaceId } });
      found++;
      console.log(`  OK: ${place.name} -> ${googlePlaceId}`);
    } else {
      console.log(`  no match: ${place.name}`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\nDone: ${found}/${places.length} places matched to a Google place_id.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
