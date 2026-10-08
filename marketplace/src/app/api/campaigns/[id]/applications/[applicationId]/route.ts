import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ApplicationStatus,
} from "@/generated/prisma/enums";

type RouteContext = {
  params: Promise<{
    id: string;
    applicationId: string;
  }>;
};

const ALLOWED_STATUSES = [
  ApplicationStatus.ACCEPTED,
  ApplicationStatus.REJECTED,
] as const;

/**
 * GET
 * View one application.
 *
 * Allowed:
 * - The creator who submitted the application
 * - The brand that owns the campaign
 */
export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: campaignId, applicationId } = await params;

    const application = await prisma.campaignApplication.findUnique({
      where: {
        id: applicationId,
      },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            brandProfile: {
              select: {
                userId: true,
                companyName: true,
              },
            },
          },
        },
        creatorProfile: {
          select: {
            id: true,
            userId: true,
            city: true,
            niche: true,
            followerCount: true,
            engagementRate: true,
            verificationStatus: true,
          },
        },
      },
    });

    if (
      !application ||
      application.campaignId !== campaignId
    ) {
      return NextResponse.json(
        { error: "Application not found for this campaign" },
        { status: 404 }
      );
    }

    const isCreator =
      session.user.role === "CREATOR" &&
      application.creatorProfile.userId === session.user.id;

    const isCampaignOwner =
      session.user.role === "BRAND" &&
      application.campaign.brandProfile.userId === session.user.id;

    if (!isCreator && !isCampaignOwner) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to view this application",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        application,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Application fetch failed:", error);

    return NextResponse.json(
      {
        error:
          "Something went wrong while fetching the application",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH
 * Brand accepts or rejects a pending application.
 */
export async function PATCH(
  request: Request,
  { params }: RouteContext
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
        {
          error: "Status must be ACCEPTED or REJECTED",
        },
        { status: 400 }
      );
    }

    const application = await prisma.campaignApplication.findUnique({
      where: {
        id: applicationId,
      },
      include: {
        campaign: {
          select: {
            id: true,
            brandProfile: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    if (
      !application ||
      application.campaignId !== campaignId
    ) {
      return NextResponse.json(
        {
          error: "Application not found for this campaign",
        },
        { status: 404 }
      );
    }

    if (
      application.campaign.brandProfile.userId !==
      session.user.id
    ) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to manage this application",
        },
        { status: 403 }
      );
    }

    if (
      application.status !==
      ApplicationStatus.PENDING
    ) {
      return NextResponse.json(
        {
          error:
            "Only pending applications can be accepted or rejected",
          currentStatus: application.status,
        },
        { status: 409 }
      );
    }

    const updatedApplication =
      await prisma.campaignApplication.update({
        where: {
          id: applicationId,
        },
        data: {
          status: status as ApplicationStatus,
        },
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
    console.error(
      "Application status update failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while updating the application",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE
 * Creator withdraws a pending application.
 *
 * We use the existing WITHDRAWN enum value instead of
 * physically deleting the database record.
 */
export async function DELETE(
  _request: Request,
  { params }: RouteContext
) {
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
        {
          error: "Only creators can withdraw applications",
        },
        { status: 403 }
      );
    }

    const { id: campaignId, applicationId } = await params;

    const application =
      await prisma.campaignApplication.findUnique({
        where: {
          id: applicationId,
        },
        include: {
          creatorProfile: {
            select: {
              userId: true,
            },
          },
        },
      });

    if (
      !application ||
      application.campaignId !== campaignId
    ) {
      return NextResponse.json(
        {
          error: "Application not found for this campaign",
        },
        { status: 404 }
      );
    }

    if (
      application.creatorProfile.userId !==
      session.user.id
    ) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to withdraw this application",
        },
        { status: 403 }
      );
    }

    if (
      application.status !==
      ApplicationStatus.PENDING
    ) {
      return NextResponse.json(
        {
          error:
            `Application is ${application.status}; only PENDING applications can be withdrawn`,
          currentStatus: application.status,
        },
        { status: 409 }
      );
    }

    const withdrawnApplication =
      await prisma.campaignApplication.update({
        where: {
          id: applicationId,
        },
        data: {
          status: ApplicationStatus.WITHDRAWN,
        },
      });

    return NextResponse.json(
      {
        success: true,
        message: "Application withdrawn successfully",
        application: withdrawnApplication,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Application withdrawal failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while withdrawing the application",
      },
      { status: 500 }
    );
  }
}