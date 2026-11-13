import type { NextAuthConfig } from "next-auth";

/** Shared, database-free part of the Auth.js config (safe to load from proxy.ts). */
export const authConfig = {
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 8, updateAge: 60 * 30 },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = "admin";
      return token;
    },
    session({ session, token }) {
      if (session.user) (session.user as { role?: unknown }).role = token.role;
      return session;
    },
  },
} satisfies NextAuthConfig;
