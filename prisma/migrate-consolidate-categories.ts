/**
 * One-time migration: retires 5 of the original 20 categories by folding
 * their places into a surviving, renamed category (or just deleting them
 * if unused), matching prisma/seed.ts's new GLOBAL_CATEGORIES list.
 * Safe to run more than once — skips merges whose source category is
 * already gone.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const isRemote = !process.env.DATABASE_URL?.includes("localhost");
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});
const prisma = new PrismaClient({ adapter });

const MERGES: { from: string; into: string }[] = [
  { from: "culture-musees", into: "temples-patrimoine" },
  { from: "nature-randonnees", into: "quartiers-balades" },
  { from: "vie-nocturne", into: "bars-rooftops" },
];

const DELETE_OUTRIGHT = ["plages", "conseils-transports"];

async function main() {
  console.log("Consolidating categories…");

  for (const { from, into } of MERGES) {
    const fromCat = await prisma.category.findUnique({ where: { slug: from } });
    if (!fromCat) {
      console.log(`  skip ${from} → ${into}: already gone`);
      continue;
    }
    const intoCat = await prisma.category.findUniqueOrThrow({ where: { slug: into } });

    const tagged = await prisma.placeCategory.findMany({ where: { categoryId: fromCat.id } });
    for (const pc of tagged) {
      await prisma.placeCategory.upsert({
        where: { placeId_categoryId: { placeId: pc.placeId, categoryId: intoCat.id } },
        update: {},
        create: { placeId: pc.placeId, categoryId: intoCat.id },
      });
    }
    await prisma.placeCategory.deleteMany({ where: { categoryId: fromCat.id } });
    await prisma.category.delete({ where: { id: fromCat.id } });
    console.log(`  merged ${from} → ${into} (${tagged.length} places retagged)`);
  }

  for (const slug of DELETE_OUTRIGHT) {
    const cat = await prisma.category.findUnique({ where: { slug } });
    if (!cat) {
      console.log(`  skip delete ${slug}: already gone`);
      continue;
    }
    await prisma.placeCategory.deleteMany({ where: { categoryId: cat.id } });
    await prisma.category.delete({ where: { id: cat.id } });
    console.log(`  deleted unused category: ${slug}`);
  }

  console.log("Consolidation complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
