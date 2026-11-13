import "server-only";
import { headers } from "next/headers";
import { BookingError } from "./booking";

/** Rejects cross-site POSTs: the Origin header must match the host serving the app. */
export async function sameOrigin(): Promise<boolean> {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) return h.get("sec-fetch-site") === "same-origin" || process.env.NODE_ENV !== "production";
  try {
    return new URL(origin).host === (h.get("x-forwarded-host") ?? h.get("host"));
  } catch {
    return false;
  }
}

export function errorResponse(e: unknown) {
  if (e instanceof BookingError) {
    const status = { SLOT_TAKEN: 409, NOT_FOUND: 404, NOT_ALLOWED: 403, TOO_MANY: 429, INVALID: 400 }[e.code];
    return Response.json({ error: e.message, code: e.code }, { status });
  }
  console.error(e);
  return Response.json({ error: "No hemos podido completar la operación. Inténtalo de nuevo." }, { status: 500 });
}

export async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > 10_000) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
