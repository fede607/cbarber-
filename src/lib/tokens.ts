import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const newToken = () => randomBytes(32).toString("base64url");
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
export const isTokenShape = (t: string) => /^[A-Za-z0-9_-]{43}$/.test(t);

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Manage-link token of an appointment. Derived from the server secret, so it can be re-issued
 * for later emails (reminder) without storing it: the database only keeps its SHA-256 hash.
 */
export function manageTokenFor(appointmentId: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`manage:${appointmentId}`).digest("base64url");
}
