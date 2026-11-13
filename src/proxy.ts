import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

/**
 * Runs before every page:
 *  1. keeps anonymous visitors out of /admin (pages and actions re-check with requireAdmin),
 *  2. sets a per-request nonce Content-Security-Policy.
 */
export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isAdminArea = pathname.startsWith("/admin");
  const isLogin = pathname === "/admin/login";
  const loggedIn = (req.auth?.user as { role?: string } | undefined)?.role === "admin";

  if (isAdminArea && !isLogin && !loggedIn) return NextResponse.redirect(new URL("/admin/login", req.nextUrl));
  if (isLogin && loggedIn) return NextResponse.redirect(new URL("/admin", req.nextUrl));

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "frame-src https://www.openstreetmap.org",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https" ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  if (isAdminArea) {
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return res;
});

export const config = {
  matcher: [{ source: "/((?!api|_next/static|_next/image|favicon.ico|placeholders|uploads|.*\\.(?:svg|png|jpg|jpeg|webp|avif|ico)$).*)" }],
};
