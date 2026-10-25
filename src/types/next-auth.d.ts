import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "ADMIN";
    } & DefaultSession["user"];
  }

  interface User {
    role?: "USER" | "ADMIN";
    // "Se souvenir de moi" on /connexion — carried from Credentials.authorize()
    // into the jwt callback, then read by the custom jwt.encode() to pick a
    // short vs. long cookie lifetime for this specific sign-in.
    remember?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    remember?: boolean;
  }
}
