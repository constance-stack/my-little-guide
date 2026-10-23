import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";

/**
 * Local-disk stand-in for private object storage. Files live outside
 * /public so nothing here is served statically — the only way to read one
 * back is through the entitlement-checked route handler at
 * /api/storage/[...path]. Swapping to S3/R2 later means rewriting this one
 * file, not any caller.
 */
const ROOT = process.env.STORAGE_ROOT ?? "./storage";

function resolveKey(key: string): string {
  const resolved = normalize(join(ROOT, key));
  if (!resolved.startsWith(normalize(ROOT))) {
    throw new Error("Invalid storage key (path traversal attempt)");
  }
  return resolved;
}

export async function put(key: string, data: Buffer): Promise<void> {
  const path = resolveKey(key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
}

export async function get(key: string): Promise<Buffer> {
  return readFile(resolveKey(key));
}

// Render's free-tier web service has no persistent disk — this ./storage
// directory is the container's own ephemeral filesystem, wiped on every
// redeploy. A PdfJob whose status is already DONE can still point at a
// file that no longer exists after a later deploy; callers that generate
// on demand (see /api/orders/[orderId]/pdf) use this to detect that case
// and regenerate instead of serving a 404.
export async function exists(key: string): Promise<boolean> {
  try {
    await access(resolveKey(key));
    return true;
  } catch {
    return false;
  }
}
