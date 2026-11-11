/**
 * Attaches every photo in seed-assets/chiangmai-photos/manifest.json to its
 * Chiang Mai place, overwriting any existing (possibly low-quality) photo.
 * Covers both the pre-existing verified photos and the new photo-completion
 * wave (Wikimedia Commons + Unsplash). Run after prisma/seed-chiangmai.ts.
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
const ASSETS_DIR = "./seed-assets/chiangmai-photos";

type ManifestEntry = {
  slug: string;
  name: string;
  found: boolean;
  source: string;
  artist: string | null;
  license: string | null;
  source_url: string | null;
};

async function main() {
  console.log("Attaching Chiang Mai photos…");
  let attached = 0;
  let skipped = 0;

  const manifest: ManifestEntry[] = JSON.parse(
    await readFile(`${ASSETS_DIR}/manifest.json`, "utf-8"),
  );

  for (const entry of manifest) {
    if (!entry.found) continue;

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

    const artist = (entry.artist ?? "").trim();
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
      attributionText: artist ? `Photo : ${artist}, via ${entry.source}${entry.license ? ` (${entry.license})` : ""}` : null,
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

  console.log(`\nDone: ${attached} photos attached, ${skipped} skipped (place not found).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
