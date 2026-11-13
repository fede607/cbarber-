import "server-only";
import { headers } from "next/headers";
import { db } from "./db";

/**
 * Fixed-window counter stored in PostgreSQL, so it also works on serverless
 * (no shared memory between instances). Returns false once the limit is exceeded.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const expires = new Date(Date.now() + windowSec * 1000);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "expiresAt") VALUES (${key}, 1, ${expires})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."expiresAt" < now() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "expiresAt" = CASE WHEN "RateLimit"."expiresAt" < now() THEN ${expires} ELSE "RateLimit"."expiresAt" END
    RETURNING "count"`;
  return Number(rows[0].count) <= limit;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  // On Vercel the platform sets x-forwarded-for; the first entry is the client.
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export const tooMany = () =>
  Response.json({ error: "Demasiadas peticiones. Espera unos minutos y vuelve a intentarlo." }, { status: 429 });
