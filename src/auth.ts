import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { buildAppleClientSecret } from "@/lib/apple-client-secret";
import { DEFAULT_WIDGETS } from "@/lib/default-widgets";

const appleClientSecret = buildAppleClientSecret();

const providers = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials) => {
      const email = credentials?.email;
      const password = credentials?.password;
      if (typeof email !== "string" || typeof password !== "string") {
        return null;
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) return null;

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return null;

      return { id: user.id, name: user.name, email: user.email };
    },
  }),
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : []),
  ...(process.env.APPLE_ID && appleClientSecret
    ? [
        Apple({
          clientId: process.env.APPLE_ID,
          clientSecret: appleClientSecret,
        }),
      ]
    : []),
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  providers,
  events: {
    // Fires exactly once, when the adapter inserts a brand-new User row
    // (OAuth first sign-in). Credentials sign-up seeds the same way from
    // its own register route, since that path creates the User directly
    // rather than through the adapter.
    async createUser({ user }) {
      if (!user.id) return;
      await prisma.widget.createMany({
        data: DEFAULT_WIDGETS.map((w) => ({ ...w, userId: user.id as string })),
      });
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
