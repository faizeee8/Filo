import { NextResponse } from "next/server";
import NextAuth from "next-auth";

import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

// Route prefix -> role that is allowed to access it.
const ROLE_PREFIXES: {
  prefix: string;
  role: "CREATOR" | "BRAND" | "ADMIN";
}[] = [
  { prefix: "/creator", role: "CREATOR" },
  { prefix: "/brand", role: "BRAND" },
  { prefix: "/admin", role: "ADMIN" },
];

const DASHBOARD_BY_ROLE: Record<string, string> = {
  CREATOR: "/creator",
  BRAND: "/brand",
  ADMIN: "/admin",
};

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;

  const matchedRule = ROLE_PREFIXES.find((rule) =>
    nextUrl.pathname.startsWith(rule.prefix)
  );

  if (!matchedRule) {
    return NextResponse.next();
  }

  // Not logged in -> send to login.
  if (!session?.user) {
    const loginUrl = new URL("/login", nextUrl.origin);

    loginUrl.searchParams.set(
      "callbackUrl",
      nextUrl.pathname
    );

    return NextResponse.redirect(loginUrl);
  }

  // Logged in but wrong role -> send to their dashboard.
  if (session.user.role !== matchedRule.role) {
    const redirectTo =
      DASHBOARD_BY_ROLE[session.user.role] ?? "/";

    return NextResponse.redirect(
      new URL(redirectTo, nextUrl.origin)
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/creator/:path*",
    "/brand/:path*",
    "/admin/:path*",
  ],
};