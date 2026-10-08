
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ApplicationStatus,
  DeliverableStatus,
} from "@/generated/prisma/enums";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (session.user.role !== "CREATOR") {
      return NextResponse.json(
        { error: "Only creators can submit deliverables" },
        { status: 403 }
      );
    }

    const { id: campaignId } = await params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "A valid JSON request body is required" },
        { status: 400 }
      );
    }

    const title =
      typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : undefined;
    const submissionUrl =
      typeof body.submissionUrl === "string"
        ? body.submissionUrl.trim()
        : "";
    const submissionNotes =
      typeof body.submissionNotes === "string"
        ? body.submissionNotes.trim()
        : undefined;

    if (!title || title.length > 200) {
      return NextResponse.json(
        { error: "Title is required and must be 200 characters or fewer" },
        { status: 400 }
      );
    }

    if (
      !submissionUrl ||
      submissionUrl.length > 2048 ||
      !URL.canParse(submissionUrl) ||
      !["http:", "https:"].includes(new URL(submissionUrl).protocol)
    ) {
      return NextResponse.json(
        { error: "A valid HTTP or HTTPS submissionUrl is required" },
        { status: 400 }
      );
    }

    if (
      (description !== undefined && description.length > 5000) ||
      (submissionNotes !== undefined && submissionNotes.length > 5000)
    ) {
      return NextResponse.json(
        { error: "Description and submissionNotes must be 5000 characters or fewer" },
        { status: 400 }
      );
    }

    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!creatorProfile) {
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404 }
      );
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const acceptedApplication =
      await prisma.campaignApplication.findFirst({
        where: {
          campaignId,
          creatorProfileId: creatorProfile.id,
          status: ApplicationStatus.ACCEPTED,
        },
        select: { id: true },
      });

    if (!acceptedApplication) {
      return NextResponse.json(
        { error: "You must have an accepted application to submit deliverables" },
        { status: 403 }
      );
    }

    const deliverable = await prisma.deliverable.create({
      data: {
        campaignId,
        creatorProfileId: creatorProfile.id,
        title,
        description: description || null,
        submissionUrl,
        submissionNotes: submissionNotes || null,
        status: DeliverableStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    });

    return NextResponse.json(
      { success: true, deliverable },
      { status: 201 }
    );
  } catch (error) {
    console.error("Deliverable creation failed:", error);

    return NextResponse.json(
      { error: "Something went wrong while submitting the deliverable" },
      { status: 500 }
    );
  }
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        brandProfile: {
          select: { userId: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    let creatorProfileId: string | undefined;

    if (session.user.role === "BRAND") {
      if (campaign.brandProfile.userId !== session.user.id) {
        return NextResponse.json(
          { error: "You are not authorized to view these deliverables" },
          { status: 403 }
        );
      }
    } else if (session.user.role === "CREATOR") {
      const creatorProfile = await prisma.creatorProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!creatorProfile) {
        return NextResponse.json(
          { error: "Creator profile not found" },
          { status: 404 }
        );
      }

      creatorProfileId = creatorProfile.id;

      const acceptedApplication =
        await prisma.campaignApplication.findFirst({
          where: {
            campaignId,
            creatorProfileId,
            status: ApplicationStatus.ACCEPTED,
          },
          select: { id: true },
        });

      if (!acceptedApplication) {
        return NextResponse.json(
          { error: "You must have an accepted application to view deliverables" },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "You are not authorized to view these deliverables" },
        { status: 403 }
      );
    }

    const deliverables = await prisma.deliverable.findMany({
      where: {
        campaignId,
        ...(creatorProfileId ? { creatorProfileId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        creatorProfile: {
          select: {
            id: true,
            city: true,
            niche: true,
          },
        },
      },
    });

    return NextResponse.json({ deliverables }, { status: 200 });
  } catch (error) {
    console.error("Deliverable listing failed:", error);

    return NextResponse.json(
      { error: "Something went wrong while listing deliverables" },
      { status: 500 }
    );
  }
}
