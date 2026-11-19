/**
 * Attaches the 26 Phuket places that already had a photo file on disk from
 * before this script existed — 20 from the original seed (`seed-phuket.ts`'s
 * GOOD_KEYS, files in seed-assets/phuket-photos/) and 6 from the earlier
 * photo-completion-wave (files in seed-assets/photo-completion-wave/) — but
 * had never gotten a PlacePhoto row, because seed-phuket.ts's own attach
 * logic reads from a scratch manifest.json that no longer exists, and
 * attach-photo-completion-wave.ts reads from scratch manifests that are
 * also gone. No manifest survives for any of these 26, so per-photo
 * attribution (artist/license/source) is unrecoverable — each photo is
 * recorded with commercialOk: false so it shows up as unverified in the
 * admin UI instead of claiming a license we can't substantiate.
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

const STORAGE_ROOT = process.env.STORAGE_ROOT ?? "./storage";

const ENTRIES: { slug: string; assetsDir: string }[] = [
  // 20 from the original seed (seed-phuket.ts GOOD_KEYS)
  ...[
    "big-buddha-phuket",
    "wat-chalong",
    "promthep-cape",
    "nai-harn-beach",
    "baba-nest-sripanwa",
    "phuket-old-town",
    "thai-hua-museum",
    "phuket-weekend-market-naka",
    "patong-beach",
    "jungceylon",
    "simon-cabaret",
    "kata-beach",
    "karon-beach",
    "freedom-beach",
    "kamala-beach",
    "wat-phra-thong",
    "sirinat-national-park-nai-yang",
    "thanyapura",
    "koh-similan",
    "koh-yao-noi",
  ].map((slug) => ({ slug, assetsDir: "./seed-assets/phuket-photos" })),
  // 6 from the earlier photo-completion-wave
  ...[
    "blue-elephant-phuket",
    "chillva-market",
    "khao-rang-hill",
    "kopitiam-by-wilai",
    "phuket-butterfly-garden",
    "phuket-fantasea",
  ].map((slug) => ({ slug, assetsDir: "./seed-assets/photo-completion-wave" })),
];

async function main() {
  console.log("Attaching Phuket wave 1 (legacy, pre-existing photo files)…");
  let attached = 0;
  let skipped = 0;

  for (const { slug, assetsDir } of ENTRIES) {
    const place = await prisma.place.findUnique({ where: { slug } });
    if (!place) {
      console.log(`  SKIP (place not found): ${slug}`);
      skipped++;
      continue;
    }

    const localPath = `${assetsDir}/${slug}.jpg`;
    const storageKey = `photos/${slug}.jpg`;
    const destPath = join(STORAGE_ROOT, storageKey);
    await mkdir(dirname(destPath), { recursive: true });
    await copyFile(localPath, destPath);

    const photoStorageKey = `/api/storage/${storageKey}`;
    const existingPhoto = await prisma.photo.findFirst({ where: { storageKey: photoStorageKey } });
    const photoData = {
      storageKey: photoStorageKey,
      photographer: "Non attribué (origine non recouvrable)",
      sourceName: "Photo héritée du seed — manifeste disparu",
      sourceUrl: "",
      licenseType: "Non vérifiée — attribution perdue, pas de manifeste disponible",
      verifiedAt: null,
      commercialOk: false,
      attributionText: null,
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

  console.log(`\nDone: ${attached} attached, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
