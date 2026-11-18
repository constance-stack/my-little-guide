// One-off: repoints existing Category.color rows to the new navy-era
// palette in GLOBAL_CATEGORIES (prisma/seed.ts) without re-running the
// full Bangkok seed. Safe to re-run (plain update by slug).
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const CATEGORY_COLORS: Record<string, string> = {
  incontournables: "#b8862e",
  "temples-patrimoine": "#8a4a3f",
  "quartiers-balades": "#3f6b52",
  "experiences-insolites": "#8c3a6b",
  "activites-famille": "#2e6b94",
  restaurants: "#7a2e3d",
  "street-food": "#c2751f",
  "cafes-brunchs": "#5c4030",
  "bars-rooftops": "#4a3570",
  marches: "#9c5a35",
  shopping: "#8c4568",
  excursions: "#35508c",
  "bien-etre-spas": "#5a8c6b",
  "points-de-vue": "#1f7a8c",
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
