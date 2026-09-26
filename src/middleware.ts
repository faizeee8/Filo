import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Route prefix -> role that is allowed to access it. `auth()` here reads the
// server-verified JWT session (see src/auth.ts), so this check cannot be
// bypassed by a client sending a fake role header/cookie.
const ROLE_PREFIXES: { prefix: string; role: "CREATOR" | "BRAND" | "ADMIN" }[] = [
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

  const matchedRule = ROLE_PREFIXES.find((r) =>
    nextUrl.pathname.startsWith(r.prefix)
  );

  if (!matchedRule) {
    return NextResponse.next();
  }

  // Not logged in at all -> send to login, remembering where they wanted to go.
  if (!session?.user) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Logged in, but wrong role for this section -> send them to their own
  // dashboard rather than the section they aren't authorized for.
  if (session.user.role !== matchedRule.role) {
    const redirectTo = DASHBOARD_BY_ROLE[session.user.role] ?? "/";
    return NextResponse.redirect(new URL(redirectTo, nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/creator/:path*", "/brand/:path*", "/admin/:path*"],
};
