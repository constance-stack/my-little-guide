/**
 * Attaches the Koh Lanta & Koh Phi Phi photo-sourcing pass: fills in photos
 * for places that had none, and replaces a few existing photos that were
 * low quality, off-subject, or barely showed the place (see manifest.json
 * for per-place notes). Reads seed-assets/lanta-phiphi-photos/manifest.json
 * and copies the matching already-resized file from that same folder.
 */
import { mkdir, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { readFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const isRemote = !process.env.DATABASE_URL?.includes("localhost");
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});
const prisma = new PrismaClient({ adapter });

const STORAGE_ROOT = process.env.STORAGE_ROOT ?? "./storage";
const ASSETS_DIR = "./seed-assets/lanta-phiphi-photos";

type ManifestEntry = {
  slug: string;
  name: string;
  found: boolean;
  source: string;
  artist: string;
  license: string;
  source_url: string;
  note?: string;
};

async function main() {
  console.log("Attaching Koh Lanta & Koh Phi Phi photos…");
  const entries: ManifestEntry[] = JSON.parse(
    await readFile(`${ASSETS_DIR}/manifest.json`, "utf-8"),
  );

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

    const photoStorageKey = `/api/storage/${storageKey}`;
    const existingPhoto = await prisma.photo.findFirst({ where: { storageKey: photoStorageKey } });
    const photoData = {
      storageKey: photoStorageKey,
      photographer: entry.artist,
      sourceName: entry.source,
      sourceUrl: entry.source_url,
      licenseType: entry.license,
      verifiedAt: new Date(),
      commercialOk: true,
      attributionText: `Photo : ${entry.artist}, via ${entry.source} (${entry.license})`,
      altText: place.name,
    };
    const photo = existingPhoto
      ? await prisma.photo.update({ where: { id: existingPhoto.id }, data: photoData })
      : await prisma.photo.create({ data: photoData });

    await prisma.placePhoto.deleteMany({ where: { placeId: place.id } });
    await prisma.placePhoto.create({ data: { placeId: place.id, photoId: photo.id, sortOrder: 0 } });

    attached++;
    console.log(`  attached: ${place.name}${entry.note ? " (replacement)" : ""}`);
  }

  console.log(`\nDone: ${attached} photos attached.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
