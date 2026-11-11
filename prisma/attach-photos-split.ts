/**
 * Attaches the Split photo wave (57/57 places) to the Place records already
 * seeded by seed-split.ts. Reads seed-assets/split-photos/manifest.json and
 * copies each resized file into STORAGE_ROOT/photos/<slug>.jpg. Does not
 * touch seed-split.ts.
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
const ASSETS_DIR = "./seed-assets/split-photos";

type ManifestEntry = {
  slug: string;
  name: string;
  found: boolean;
  source?: string;
  artist?: string | null;
  license?: string | null;
  source_url?: string | null;
};

async function main() {
  console.log("Attaching Split photos…");
  let attached = 0;

  const raw = await readFile(`${ASSETS_DIR}/manifest.json`, "utf-8");
  const entries: ManifestEntry[] = JSON.parse(raw);

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

    const artist = (entry.artist ?? "").trim();
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

  console.log(`\nDone: ${attached} photos attached.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
