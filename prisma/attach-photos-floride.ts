/**
 * Attaches the Floride photo-completion wave: 31 places that had no photo
 * at all in seed-floride.ts's GOOD_KEYS, plus 3 replacements for existing
 * photos that were off-subject, blurry, or too dark (cocoa-beach,
 * mission-nombre-de-dios, southernmost-point-buoy). Sourced from Wikimedia
 * Commons (verified against each place) with two Unsplash fallbacks where
 * Commons had nothing usable (winter-park-scenic-boat-tour,
 * st-petersburg-central-arts-district). world-equestrian-center-ocala was
 * left without a photo — no genuine match found on either source.
 * Metadata read from seed-assets/floride-photos/manifest.json; images
 * copied from that same folder (already resized to ~1800px wide).
 */
import { mkdir, copyFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const isRemote = !process.env.DATABASE_URL?.includes("localhost");
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});
const prisma = new PrismaClient({ adapter });

const STORAGE_ROOT = process.env.STORAGE_ROOT ?? "./storage";
const ASSETS_DIR = "./seed-assets/floride-photos";
const MANIFEST_PATH = `${ASSETS_DIR}/manifest.json`;

type ManifestEntry = {
  slug: string;
  name: string;
  found: boolean;
  source: string;
  artist: string;
  license: string;
  source_url: string;
};

async function main() {
  console.log("Attaching Floride photo-completion wave…");

  const raw = await readFile(MANIFEST_PATH, "utf-8");
  const entries: ManifestEntry[] = JSON.parse(raw);

  let attached = 0;
  for (const entry of entries) {
    if (!entry.found) continue;

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

    const artist = entry.artist.trim();
    const photoStorageKey = `/api/storage/${storageKey}`;
    const existingPhoto = await prisma.photo.findFirst({ where: { storageKey: photoStorageKey } });
    const photoData = {
      storageKey: photoStorageKey,
      photographer: artist || "Non attribué (licence le permettant)",
      sourceName: entry.source,
      sourceUrl: entry.source_url ?? "",
      licenseType: entry.license ?? "",
      verifiedAt: new Date(),
      commercialOk: true,
      attributionText: artist ? `Photo : ${artist}, via ${entry.source} (${entry.license})` : null,
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

  console.log(`\nDone: ${attached} photos attached.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
