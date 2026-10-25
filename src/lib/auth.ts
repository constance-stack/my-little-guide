import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Nodemailer from "next-auth/providers/nodemailer";
import { encode as defaultEncode } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const REMEMBERED_MAX_AGE = 60 * 60 * 24 * 90; // 90 days — "se souvenir de moi" checked
const NOT_REMEMBERED_MAX_AGE = 60 * 60 * 24; // 1 day — box unchecked

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Auth.js only auto-trusts the request Host header on platforms it
  // recognizes (Vercel) or outside production. Render terminates TLS and
  // proxies to this single container under our own NEXTAUTH_URL, the same
  // trust model Vercel gets automatically — without this, every request
  // fails with "UntrustedHost" before auth logic even runs.
  trustHost: true,
  // JWT strategy, deliberately. The Credentials provider's callback route
  // always writes a JWT-encoded session cookie, regardless of the configured
  // strategy (verified directly in @auth/core's source, not documented).
  // Configuring "database" here only changes how auth() tries to *read* the
  // cookie back — it would treat that JWT string as a raw session-table key
  // and never find it, silently failing every credentials login. JWT keeps
  // both providers consistent. The adapter is still required for the
  // Nodemailer (magic-link) provider's user/verification-token storage.
  // The static ceiling: how long the session cookie itself can possibly
  // live. The custom jwt.encode below picks a *shorter* actual lifetime
  // per sign-in when "se souvenir de moi" wasn't checked — Auth.js has no
  // built-in per-request maxAge, so this is the documented workaround
  // (override jwt.encode, ignore the maxAge it's called with, compute our
  // own from a flag carried on the token).
  session: { strategy: "jwt", maxAge: REMEMBERED_MAX_AGE },
  jwt: {
    encode: async ({ token, secret, salt }) => {
      const maxAge = token?.remember === false ? NOT_REMEMBERED_MAX_AGE : REMEMBERED_MAX_AGE;
      return defaultEncode({ token, secret, salt, maxAge });
    },
  },
  pages: {
    signIn: "/connexion",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
        remember: { label: "Se souvenir de moi", type: "text" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash || user.deletedAt) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          remember: credentials?.remember !== "false",
        };
      },
    }),
    Nodemailer({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: process.env.EMAIL_SERVER_USER
          ? { user: process.env.EMAIL_SERVER_USER, pass: process.env.EMAIL_SERVER_PASSWORD }
          : undefined,
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
  callbacks: {
    // Belt-and-suspenders: Credentials already rejects a deleted account in
    // authorize(), but the magic-link (Nodemailer) flow goes through the
    // adapter's own user lookup instead, which this callback also covers.
    signIn: async ({ user }) => {
      if (!user?.email) return true;
      const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
      return !dbUser?.deletedAt;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: "USER" | "ADMIN" }).role ?? "USER";
        // Magic-link sign-ins never set this (no checkbox on that form) —
        // defaults to remembered, which is the sane default for that flow.
        token.remember = user.remember ?? true;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "USER" | "ADMIN") ?? "USER";
      }
      return session;
    },
  },
});
