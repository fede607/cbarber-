import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { verify as verifyTotp } from "otplib";
import { z } from "zod";
import { redirect } from "next/navigation";
import { authConfig } from "./auth.config";
import { db } from "./lib/db";
import { clientIp, rateLimit } from "./lib/rate-limit";

const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
  code: z.string().trim().max(10).optional(),
});

// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = "$2b$12$CwTycUXWue0Thq9StjUM0uJ8l1bXnE6yq8B2sQ0Yb3yI6zq1xXK9e";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, code: {} },
      async authorize(raw) {
        const parsed = credentials.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password, code } = parsed.data;
        const ip = await clientIp();

        // 8 attempts per IP and 8 per account every 15 minutes.
        const okIp = await rateLimit(`login:ip:${ip}`, 8, 900);
        const okUser = await rateLimit(`login:user:${email}`, 8, 900);
        if (!okIp || !okUser) {
          await db.auditLog.create({ data: { action: "login_blocked", detail: email, ip } });
          return null;
        }

        const user = await db.adminUser.findUnique({ where: { email } });
        const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        let ok = Boolean(user) && passwordOk;

        if (ok && user!.totpEnabled && user!.totpSecret) {
          const res = code ? await verifyTotp({ secret: user!.totpSecret, token: code.replace(/\s/g, ""), epochTolerance: 30 }).catch(() => null) : null;
          ok = Boolean(res?.valid);
        }

        await db.auditLog.create({ data: { action: ok ? "login_ok" : "login_failed", detail: email, ip } });
        return ok ? { id: user!.id, email: user!.email, name: "Carlos" } : null;
      },
    }),
  ],
});

/** Call at the top of every admin page, server action and admin route handler. */
export async function requireAdmin() {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== "admin") redirect("/admin/login");
  return session!;
}

export async function isAdmin() {
  const session = await auth();
  return (session?.user as { role?: string } | undefined)?.role === "admin";
}
