import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { db } from "@/src/lib/db";
import { parseUserRole } from "@/src/lib/user-role";

const authSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) {
          return null;
        }

        const email = typeof credentials.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials.password === "string" ? credentials.password : "";

        if (!email || !password) {
          return null;
        }

        const user = await db.appUser.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            displayName: true,
            passwordHash: true,
            role: true,
            isActive: true,
          },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const role = parseUserRole(user.role);
        if (!role) {
          return null;
        }

        const matches = await bcrypt.compare(password, user.passwordHash);
        if (!matches) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          displayName: user.displayName,
          role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.displayName = user.displayName;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const role = typeof token.role === "string" ? parseUserRole(token.role) : null;

        session.user.id = typeof token.userId === "string" ? token.userId : token.sub ?? "";
        session.user.role = role ?? "READ_ONLY";
        session.user.displayName =
          typeof token.displayName === "string" ? token.displayName : session.user.name ?? session.user.email ?? "";
        session.user.name = session.user.displayName;
      }

      return session;
    },
  },
};

export function getServerAuthSession() {
  return getServerSession(authOptions);
}