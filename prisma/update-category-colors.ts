// One-off: repoints existing Category.color rows to the new navy-era
// palette in GLOBAL_CATEGORIES (prisma/seed.ts) without re-running the
// full Bangkok seed. Safe to re-run (plain update by slug).
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const CATEGORY_COLORS: Record<string, string> = {
  incontournables: "#b8862e",
  "temples-patrimoine": "#b5502c",
  "quartiers-balades": "#3f7a4a",
  "experiences-insolites": "#9c3fb8",
  "activites-famille": "#2e63b8",
  restaurants: "#b8213f",
  "street-food": "#c9781e",
  "cafes-brunchs": "#5c3a28",
  "bars-rooftops": "#3f4bb8",
  marches: "#7a8a2e",
  shopping: "#6b3fb8",
  excursions: "#1f3d7a",
  "bien-etre-spas": "#3f9c6e",
  "points-de-vue": "#1f8a8c",
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
