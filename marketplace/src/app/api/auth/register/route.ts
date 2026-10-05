import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      name,
      companyName,
      email,
      password,
      role: requestedRole,
    } = body;

    // ---------------------------------------------------------
    // Basic validation
    // ---------------------------------------------------------

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          error: "Name, email and password are required",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // Password validation
    // ---------------------------------------------------------

    if (password.length < 8) {
      return NextResponse.json(
        {
          error: "Password must be at least 8 characters",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // Email validation
    // ---------------------------------------------------------

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail.includes("@")) {
      return NextResponse.json(
        {
          error: "Please enter a valid email address",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // Determine account role
    // ---------------------------------------------------------

    const isBrand = requestedRole === "BRAND";

    const role = isBrand ? Role.BRAND : Role.CREATORS;

    // ---------------------------------------------------------
    // Brand-specific validation
    // ---------------------------------------------------------

    if (isBrand && (!companyName || !companyName.trim())) {
      return NextResponse.json(
        {
          error: "Company name is required for brand accounts",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // Check existing email
    // ---------------------------------------------------------

    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "An account with this email already exists",
        },
        { status: 409 }
      );
    }

    // ---------------------------------------------------------
    // Hash password
    // ---------------------------------------------------------

    const passwordHash = await bcrypt.hash(password, 12);

    // ---------------------------------------------------------
    // Create User + Profile in one transaction
    // ---------------------------------------------------------

    const createdUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role,
        },
      });

      // -------------------------------------------------------
      // Create BrandProfile for brand accounts
      // -------------------------------------------------------

      if (isBrand) {
        await tx.brandProfile.create({
          data: {
            userId: user.id,
            companyName: companyName.trim(),
            city: "Hyderabad",
          },
        });
      } else {
        // -----------------------------------------------------
        // Create CreatorProfile for creator accounts
        // -----------------------------------------------------

        await tx.creatorProfile.create({
          data: {
            userId: user.id,
            city: "Hyderabad",
          },
        });
      }

      return user;
    });

    // ---------------------------------------------------------
    // Success response
    // ---------------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully",
        user: {
          id: createdUser.id,
          name: createdUser.name,
          email: createdUser.email,
          role: createdUser.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration failed:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while creating your account",
      },
      { status: 500 }
    );
  }
}