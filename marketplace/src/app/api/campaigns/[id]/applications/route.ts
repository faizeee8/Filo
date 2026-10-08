import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import { ApplicationStatus } from "@/generated/prisma/enums";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/campaigns/{id}/applications
// Allows the brand that owns the campaign to view all applications.
export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Authentication required",
        },
        {
          status: 401,
        }
      );
    }

    // Only brands can view campaign applications
    if (session.user.role !== "BRAND") {
      return NextResponse.json(
        {
          error: "Only brands can view campaign applications",
        },
        {
          status: 403,
        }
      );
    }

    // Get campaign ID from URL
    const { id: campaignId } = await params;

    if (!campaignId) {
      return NextResponse.json(
        {
          error: "Campaign ID is required",
        },
        {
          status: 400,
        }
      );
    }

    // Find campaign and verify that the current brand owns it
    const campaign = await prisma.campaign.findUnique({
      where: {
        id: campaignId,
      },
      select: {
        id: true,
        title: true,
        brandProfile: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        {
          error: "Campaign not found",
        },
        {
          status: 404,
        }
      );
    }

    // Prevent other brands from viewing applications
    if (campaign.brandProfile.userId !== session.user.id) {
      return NextResponse.json(
        {
          error:
            "You are not authorized to view applications for this campaign",
        },
        {
          status: 403,
        }
      );
    }

    // Get all applications for this campaign
    const applications =
      await prisma.campaignApplication.findMany({
        where: {
          campaignId,
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
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

    return NextResponse.json(
      {
        success: true,
        campaign: {
          id: campaign.id,
          title: campaign.title,
        },
        count: applications.length,
        applications,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Campaign applications listing failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while listing campaign applications",
      },
      {
        status: 500,
      }
    );
  }
}

// POST /api/campaigns/{id}/applications
// Allows an authenticated creator to apply to a campaign.
export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Authentication required",
        },
        {
          status: 401,
        }
      );
    }

    // Only creators can apply
    if (session.user.role !== "CREATOR") {
      return NextResponse.json(
        {
          error: "Only creators can apply to campaigns",
        },
        {
          status: 403,
        }
      );
    }

    // Get campaign ID from URL
    const { id: campaignId } = await params;

    if (!campaignId) {
      return NextResponse.json(
        {
          error: "Campaign ID is required",
        },
        {
          status: 400,
        }
      );
    }

    // Find creator profile
    const creatorProfile =
      await prisma.creatorProfile.findUnique({
        where: {
          userId: session.user.id,
        },
      });

    if (!creatorProfile) {
      return NextResponse.json(
        {
          error:
            "Creator profile not found for this user",
        },
        {
          status: 404,
        }
      );
    }

    // Find campaign
    const campaign =
      await prisma.campaign.findUnique({
        where: {
          id: campaignId,
        },
        include: {
          brandProfile: {
            select: {
              userId: true,
              companyName: true,
            },
          },
        },
      });

    if (!campaign) {
      return NextResponse.json(
        {
          error: "Campaign not found",
        },
        {
          status: 404,
        }
      );
    }

    // Prevent brand owner from applying to their own campaign
    if (
      campaign.brandProfile.userId ===
      session.user.id
    ) {
      return NextResponse.json(
        {
          error:
            "You cannot apply to your own campaign",
        },
        {
          status: 403,
        }
      );
    }

    // Check application deadline
    if (
      campaign.applicationDeadline &&
      campaign.applicationDeadline < new Date()
    ) {
      return NextResponse.json(
        {
          error:
            "The application deadline for this campaign has passed",
        },
        {
          status: 400,
        }
      );
    }

    // Check if creator has already applied
    const existingApplication =
      await prisma.campaignApplication.findUnique({
        where: {
          campaignId_creatorProfileId: {
            campaignId,
            creatorProfileId: creatorProfile.id,
          },
        },
      });

    if (existingApplication) {
      return NextResponse.json(
        {
          error:
            "You have already applied to this campaign",
          application: existingApplication,
        },
        {
          status: 409,
        }
      );
    }

    // Read request body
    const body = await request.json();

    const {
      message,
      proposedRate,
    } = body;

    // Validate message
    if (
      message !== undefined &&
      message !== null &&
      typeof message !== "string"
    ) {
      return NextResponse.json(
        {
          error: "Message must be a string",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof message === "string" &&
      message.trim().length > 2000
    ) {
      return NextResponse.json(
        {
          error:
            "Message cannot be longer than 2000 characters",
        },
        {
          status: 400,
        }
      );
    }

    // Validate proposed rate
    if (
      proposedRate !== undefined &&
      proposedRate !== null &&
      (!Number.isInteger(Number(proposedRate)) ||
        Number(proposedRate) < 0)
    ) {
      return NextResponse.json(
        {
          error:
            "proposedRate must be a non-negative integer",
        },
        {
          status: 400,
        }
      );
    }

    // Create application
    const application =
      await prisma.campaignApplication.create({
        data: {
          campaignId,

          creatorProfileId:
            creatorProfile.id,

          message:
            typeof message === "string" &&
            message.trim()
              ? message.trim()
              : null,

          proposedRate:
            proposedRate !== undefined &&
            proposedRate !== null
              ? Number(proposedRate)
              : null,

          status: ApplicationStatus.PENDING,
        },

        include: {
          campaign: {
            select: {
              id: true,
              title: true,
              niche: true,
              targetLocation: true,
              status: true,
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

    return NextResponse.json(
      {
        success: true,
        message:
          "Application submitted successfully",
        application,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Campaign application failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while submitting the application",
      },
      {
        status: 500,
      }
    );
  }
}