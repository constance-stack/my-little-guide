// One-off: repoints existing Category.color rows to the new navy-era
// palette in GLOBAL_CATEGORIES (prisma/seed.ts) without re-running the
// full Bangkok seed. Safe to re-run (plain update by slug).
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const CATEGORY_COLORS: Record<string, string> = {
  incontournables: "#f5d896",
  "temples-patrimoine": "#f5bea0",
  "quartiers-balades": "#a8e8b8",
  "experiences-insolites": "#e8acd8",
  "activites-famille": "#a8d4e8",
  restaurants: "#f5a8bc",
  "street-food": "#f9cb9a",
  "cafes-brunchs": "#cfab8c",
  "bars-rooftops": "#b8acec",
  marches: "#e0e89a",
  shopping: "#caace8",
  excursions: "#adc0ec",
  "bien-etre-spas": "#a8e8ce",
  "points-de-vue": "#a8e4e8",
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
