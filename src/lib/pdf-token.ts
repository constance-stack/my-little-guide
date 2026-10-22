import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A short-lived, server-issued token so Playwright can load the PDF print
 * route as "this order's owner" without a real login session — Playwright
 * has no browser cookie jar logged in as anyone. Never a substitute for
 * real auth anywhere else.
 */
const TTL_MS = 5 * 60 * 1000;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not configured.");
  return s;
}

export function createPdfToken(orderId: string): string {
  const expires = Date.now() + TTL_MS;
  const payload = `${orderId}:${expires}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyPdfToken(orderId: string, token: string | null): boolean {
  if (!token) return false;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return false;

  const payload = Buffer.from(payloadB64, "base64url").toString();
  const [tokenOrderId, expiresStr] = payload.split(":");
  if (tokenOrderId !== orderId) return false;

  const expectedSig = createHmac("sha256", secret()).update(payload).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return false;

  return Date.now() < Number(expiresStr);
}
