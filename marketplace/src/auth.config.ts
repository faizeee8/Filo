import type { NextAuthConfig } from "next-auth";

export default {
  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },

  // Providers are defined in src/auth.ts because
  // Credentials requires Prisma and bcrypt.
  providers: [],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;

        session.user.role = token.role as
          | "CREATOR"
          | "BRAND"
          | "ADMIN";
      }

      return session;
    },
  },
} satisfies NextAuthConfig;