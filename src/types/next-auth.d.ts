import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "CREATOR" | "BRAND" | "ADMIN";
    } & DefaultSession["user"];
  }

  interface User {
    role: "CREATOR" | "BRAND" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "CREATOR" | "BRAND" | "ADMIN";
  }
}
