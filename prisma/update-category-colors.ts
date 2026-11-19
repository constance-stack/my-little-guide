// One-off: repoints existing Category.color rows to the new navy-era
// palette in GLOBAL_CATEGORIES (prisma/seed.ts) without re-running the
// full Bangkok seed. Safe to re-run (plain update by slug).
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const CATEGORY_COLORS: Record<string, string> = {
  incontournables: "#e8a816",
  "temples-patrimoine": "#e8622e",
  "quartiers-balades": "#2eb84f",
  "experiences-insolites": "#c23fe8",
  "activites-famille": "#2e97e8",
  restaurants: "#e8213f",
  "street-food": "#f28c1e",
  "cafes-brunchs": "#a8672e",
  "bars-rooftops": "#5c4de8",
  marches: "#a8c91e",
  shopping: "#8c3fe8",
  excursions: "#2e5ee8",
  "bien-etre-spas": "#2ec98a",
  "points-de-vue": "#1ecaca",
};

const isRemote = !process.env.DATABASE_URL?.includes("localhost");
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const [slug, color] of Object.entries(CATEGORY_COLORS)) {
    const result = await prisma.category.updateMany({ where: { slug }, data: { color } });
    console.log(`${result.count ? "updated" : "SKIP (not found)"}: ${slug} -> ${color}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
