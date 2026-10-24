/**
 * One-off cleanup: removes Bronx Zoo and Central Park Zoo from New York
 * (user explicitly doesn't want zoos in any guide) — these were already
 * seeded before the no-zoo rule was raised, so prisma upsert in
 * seed-new-york.ts won't remove them on its own; this deletes the rows
 * directly.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const isRemote = !process.env.DATABASE_URL?.includes("localhost");
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const slugs = ["bronx-zoo", "central-park-zoo"];
  for (const slug of slugs) {
    const place = await prisma.place.findUnique({ where: { slug } });
    if (!place) {
      console.log(`  ${slug}: not found, skipping`);
      continue;
    }
    await prisma.placeCategory.deleteMany({ where: { placeId: place.id } });
    await prisma.placePhoto.deleteMany({ where: { placeId: place.id } });
    await prisma.favorite.deleteMany({ where: { placeId: place.id } });
    await prisma.tripStop.deleteMany({ where: { placeId: place.id } });
    await prisma.place.delete({ where: { id: place.id } });
    console.log(`  deleted: ${slug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
