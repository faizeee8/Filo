import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // This is the ONLY place a user's role is ever established for a
      // session — it is read from the database record, never from
      // client-submitted form data. See PROJECT_NOTES.md ("role trust").
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user) return null;

        const passwordValid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );
        if (!passwordValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    // Runs server-side whenever a JWT is created/updated. `user` is only
    // present on initial sign-in (straight from `authorize` above), so the
    // role gets baked into the token once, from the DB, and never trusted
    // from anywhere else afterward.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    // Exposes id/role on the client-visible session object so UI can read
    // them, but every server-side authorization check re-verifies against
    // this token server-side (see middleware.ts and requireRole helpers) —
    // the client session is for display only, never the source of truth.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "CREATOR" | "BRAND" | "ADMIN";
      }
      return session;
    },
  },
});
