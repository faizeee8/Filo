
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@/generated/prisma/enums";

const ALLOWED_STATUSES = [
  ApplicationStatus.ACCEPTED,
  ApplicationStatus.REJECTED,
] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; applicationId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (session.user.role !== "BRAND") {
      return NextResponse.json(
        { error: "Only brands can manage applications" },
        { status: 403 }
      );
    }

    const { id: campaignId, applicationId } = await params;

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "A valid JSON request body is required" },
        { status: 400 }
      );
    }

    const status = body.status;

    if (
      typeof status !== "string" ||
      !ALLOWED_STATUSES.includes(
        status as (typeof ALLOWED_STATUSES)[number]
      )
    ) {
      return NextResponse.json(
        { error: "Status must be ACCEPTED or REJECTED" },
        { status: 400 }
      );
    }

    const application = await prisma.campaignApplication.findUnique({
      where: { id: applicationId },
      include: {
        campaign: {
          select: {
            id: true,
            brandProfile: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!application || application.campaignId !== campaignId) {
      return NextResponse.json(
        { error: "Application not found for this campaign" },
        { status: 404 }
      );
    }

    if (application.campaign.brandProfile.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You are not authorized to manage this application" },
        { status: 403 }
      );
    }

    if (application.status !== ApplicationStatus.PENDING) {
      return NextResponse.json(
        {
          error: "Only pending applications can be accepted or rejected",
          currentStatus: application.status,
        },
        { status: 409 }
      );
    }

    const updatedApplication = await prisma.campaignApplication.update({
      where: { id: applicationId },
      data: { status: status as ApplicationStatus },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
          },
        },
        creatorProfile: {
          select: {
            id: true,
            userId: true,
            city: true,
            niche: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Application ${status.toLowerCase()} successfully`,
        application: updatedApplication,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Application status update failed:", error);

    return NextResponse.json(
      { error: "Something went wrong while updating the application" },
      { status: 500 }
    );
  }
}
