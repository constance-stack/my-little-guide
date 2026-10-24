/**
 * Attaches the 22 genuine photo matches found in the broader "really dig
 * for missing photos" pass across Bangkok, Chiang Mai, Phuket, and Koh
 * Lanta & Koh Phi Phi — manually sanity-checked one by one (most
 * candidates from the wider search were false positives: generic/common
 * place names matching unrelated Commons photos by coincidence, rejected
 * rather than attached). Reads manifest metadata from each destination's
 * scratch search output; copies the already-resized file from
 * seed-assets/photo-completion-wave/.
 */
import { mkdir, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const isRemote = !process.env.DATABASE_URL?.includes("localhost");
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});
const prisma = new PrismaClient({ adapter });

const SCRATCH =
  "/private/tmp/claude-501/-Users-constance/8b5fbae2-2d1e-4365-aae7-917e8137a620/scratchpad";
const STORAGE_ROOT = process.env.STORAGE_ROOT ?? "./storage";
const ASSETS_DIR = "./seed-assets/photo-completion-wave";

const MANIFESTS = [
  "photos_thorough_bangkok/manifest.json",
  "photos_thorough_chiangmai/manifest.json",
  "photos_thorough_phuket/manifest.json",
  "photos_thorough_lantaphiphi/manifest.json",
];

const CONFIRMED_SLUGS = new Set([
  "octave-rooftop",
  "doi-suthep-pui-national-park",
  "flight-of-the-gibbon",
  "khao-soi-mae-sai",
  "pai",
  "taste-from-heaven",
  "three-kings-monument",
  "bang-tao-beach",
  "blue-elephant-phuket",
  "chillva-market",
  "khao-rang-hill",
  "kopitiam-by-wilai",
  "khao-sok-national-park",
  "phuket-butterfly-garden",
  "phuket-fantasea",
  "khlong-nin-beach",
  "lo-bakao-beach",
  "long-beach-lanta",
  "maya-bay",
  "nui-bay-phi-phi",
  "pileh-lagoon",
  "phi-phi-viewpoint",
]);

type ManifestEntry = {
  slug: string;
  name: string;
  found: boolean;
  title?: string;
  artist?: string;
  license?: string;
  source_url?: string;
};

async function main() {
  console.log("Attaching photo-completion wave…");
  let attached = 0;

  for (const manifestPath of MANIFESTS) {
    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(`${SCRATCH}/${manifestPath}`, "utf-8");
    const entries: ManifestEntry[] = JSON.parse(raw);

    for (const entry of entries) {
      if (!CONFIRMED_SLUGS.has(entry.slug) || !entry.found) continue;

      const place = await prisma.place.findUnique({ where: { slug: entry.slug } });
      if (!place) {
        console.log(`  SKIP (place not found): ${entry.slug}`);
        continue;
      }

      const localPath = `${ASSETS_DIR}/${entry.slug}.jpg`;
      const storageKey = `photos/${entry.slug}.jpg`;
      const destPath = join(STORAGE_ROOT, storageKey);
      await mkdir(dirname(destPath), { recursive: true });
      await copyFile(localPath, destPath);

      const artist = (entry.artist ?? "").split("\n")[0].replace(/Feel free to.*/i, "").trim();
      const photoStorageKey = `/api/storage/${storageKey}`;
      const existingPhoto = await prisma.photo.findFirst({ where: { storageKey: photoStorageKey } });
      const photoData = {
        storageKey: photoStorageKey,
        photographer: artist || "Non attribué (licence le permettant)",
        sourceName: "Wikimedia Commons",
        sourceUrl: entry.source_url ?? "",
        licenseType: entry.license ?? "",
        verifiedAt: new Date(),
        commercialOk: true,
        attributionText: artist ? `Photo : ${artist}, via Wikimedia Commons (${entry.license})` : null,
        altText: place.name,
      };
      const photo = existingPhoto
        ? await prisma.photo.update({ where: { id: existingPhoto.id }, data: photoData })
        : await prisma.photo.create({ data: photoData });

      await prisma.placePhoto.deleteMany({ where: { placeId: place.id } });
      await prisma.placePhoto.create({ data: { placeId: place.id, photoId: photo.id, sortOrder: 0 } });

      attached++;
      console.log(`  attached: ${place.name}`);
    }
  }

  console.log(`\nDone: ${attached} photos attached.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
