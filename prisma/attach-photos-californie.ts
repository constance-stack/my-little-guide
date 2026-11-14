/**
 * Attaches the Californie destination's sourced photos (Wikimedia Commons,
 * one Unsplash fallback for Heavenly Mountain Resort) to their places.
 * Reads seed-assets/californie-photos/manifest.json, copies each resized
 * JPEG into STORAGE_ROOT, and upserts Photo + PlacePhoto rows.
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
const ASSETS_DIR = "./seed-assets/californie-photos";

type ManifestEntry = {
  slug: string;
  name: string;
  found: boolean;
  source?: string;
  title?: string;
  artist?: string;
  license?: string;
  source_url?: string;
};

async function main() {
  console.log("Attaching Californie photos…");
  const raw = await readFile(join(ASSETS_DIR, "manifest.json"), "utf-8");
  const entries: ManifestEntry[] = JSON.parse(raw);

  let attached = 0;

  for (const entry of entries) {
    if (!entry.found) continue;

    const place = await prisma.place.findUnique({ where: { slug: entry.slug } });
    if (!place) {
      console.log(`  SKIP (place not found): ${entry.slug}`);
      continue;
    }

    const localPath = join(ASSETS_DIR, `${entry.slug}.jpg`);
    const storageKey = `photos/${entry.slug}.jpg`;
    const destPath = join(STORAGE_ROOT, storageKey);
    await mkdir(dirname(destPath), { recursive: true });
    await copyFile(localPath, destPath);

    const artist = (entry.artist ?? "").split("\n")[0].trim();
    const photoStorageKey = `/api/storage/${storageKey}`;
    const existingPhoto = await prisma.photo.findFirst({ where: { storageKey: photoStorageKey } });
    const photoData = {
      storageKey: photoStorageKey,
      photographer: artist || "Non attribué (licence le permettant)",
      sourceName: entry.source ?? "Wikimedia Commons",
      sourceUrl: entry.source_url ?? "",
      licenseType: entry.license ?? "",
      verifiedAt: new Date(),
      commercialOk: true,
      attributionText: artist ? `Photo : ${artist}, via ${entry.source ?? "Wikimedia Commons"} (${entry.license})` : null,
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

  console.log(`\nDone: ${attached}/${entries.length} photos attached.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
