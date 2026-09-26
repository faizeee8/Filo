import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Server-side validation is authoritative. `role` here can only ever be
  // CREATOR or BRAND — the schema's enum has no ADMIN option, so there is no
  // code path by which a client request can mint an admin account.
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, password, role, companyName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: { name, email, passwordHash, role },
      });

      if (role === "CREATOR") {
        await tx.creatorProfile.create({
          data: { userId: createdUser.id },
        });
      } else {
        await tx.brandProfile.create({
          data: { userId: createdUser.id, companyName: companyName! },
        });
      }

      return createdUser;
    });

    return NextResponse.json(
      { id: user.id, email: user.email, role: user.role },
      { status: 201 }
    );
  } catch (err) {
    console.error("Registration failed:", err);
    return NextResponse.json(
      { error: "Something went wrong while creating your account" },
      { status: 500 }
    );
  }
}
