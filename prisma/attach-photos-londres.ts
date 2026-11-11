/**
 * Attaches the London photo wave: one verified photo per place found in
 * seed-assets/londres-photos/, sourced from Wikimedia Commons and manually
 * checked against each place's name/location (false positives such as
 * wrong-city or wrong-subject matches were caught and corrected before this
 * file was written). Copies the resized JPEGs from seed-assets/ into
 * STORAGE_ROOT/photos/ and upserts Photo + PlacePhoto rows by storageKey.
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
const ASSETS_DIR = "./seed-assets/londres-photos";

type ManifestEntry = {
  slug: string;
  name: string;
  found: boolean;
  source: string;
  artist: string;
  license: string;
  source_url: string;
  title: string;
};

async function main() {
  console.log("Attaching London photo wave…");
  const raw = await readFile(`${ASSETS_DIR}/manifest.json`, "utf-8");
  const entries: ManifestEntry[] = JSON.parse(raw);

  let attached = 0;
  let skipped = 0;

  for (const entry of entries) {
    if (!entry.found) {
      skipped++;
      continue;
    }

    const place = await prisma.place.findUnique({ where: { slug: entry.slug } });
    if (!place) {
      console.log(`  SKIP (place not found): ${entry.slug}`);
      skipped++;
      continue;
    }

    const localPath = `${ASSETS_DIR}/${entry.slug}.jpg`;
    const storageKey = `photos/${entry.slug}.jpg`;
    const destPath = join(STORAGE_ROOT, storageKey);
    await mkdir(dirname(destPath), { recursive: true });
    await copyFile(localPath, destPath);

    const photoStorageKey = `/api/storage/${storageKey}`;
    const existingPhoto = await prisma.photo.findFirst({ where: { storageKey: photoStorageKey } });
    const photoData = {
      storageKey: photoStorageKey,
      photographer: entry.artist || "Non attribué (licence le permettant)",
      sourceName: entry.source,
      sourceUrl: entry.source_url ?? "",
      licenseType: entry.license ?? "",
      verifiedAt: new Date(),
      commercialOk: true,
      attributionText: entry.artist
        ? `Photo : ${entry.artist}, via ${entry.source} (${entry.license})`
        : null,
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

  console.log(`\nDone: ${attached} photos attached, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
