import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import bcrypt from "bcryptjs";

import { db } from "@/src/lib/db";
import { parseUserRole } from "@/src/lib/user-role";

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

// ---------------------------------------------------------------------------
// OAuth provider availability
// Providers are conditionally registered based on environment variables.
// The app works with credentials-only if OAuth vars are absent.
// ---------------------------------------------------------------------------
export const enabledOAuthProviders = {
  google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  microsoft: !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET),
} as const;

// ---------------------------------------------------------------------------
// Provider list
// ---------------------------------------------------------------------------
const providers: NextAuthOptions["providers"] = [
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
];

if (enabledOAuthProviders.google) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  );
}

if (enabledOAuthProviders.microsoft) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID, // omit for multi-tenant
    })
  );
}

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
  providers,
  callbacks: {
    // -----------------------------------------------------------------------
    // signIn — gate OAuth sign-ins against the AppUser table.
    // Credentials sign-in is gated by authorize() above.
    // -----------------------------------------------------------------------
    async signIn({ user, account }) {
      if (account?.provider === "credentials") {
        return true;
      }

      // OAuth path: AppUser must exist and be active.
      const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : null;
      if (!email) {
        return "/?auth=oauth-denied";
      }

      const appUser = await db.appUser.findUnique({
        where: { email },
        select: { isActive: true },
      });

      if (!appUser || !appUser.isActive) {
        return "/?auth=oauth-denied";
      }

      return true;
    },

    // -----------------------------------------------------------------------
    // jwt — enrich token with our internal fields on first sign-in.
    // For credentials: user object already has id/role/displayName from authorize().
    // For OAuth: look up AppUser by email to get our id/role/displayName.
    // -----------------------------------------------------------------------
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "credentials") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const u = user as any;
          token.userId = u.id;
          token.role = u.role;
          token.displayName = u.displayName;
        } else {
          // OAuth: user.id is the provider subject — look up our AppUser by email.
          const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : null;
          if (email) {
            const appUser = await db.appUser.findUnique({
              where: { email },
              select: { id: true, role: true, displayName: true },
            });
            if (appUser) {
              token.userId = appUser.id;
              token.role = parseUserRole(appUser.role) ?? undefined;
              token.displayName = appUser.displayName;
            }
          }
        }
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