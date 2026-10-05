import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

import {
  Niche,
  Platform,
  CollaborationType,
  CampaignStatus,
} from "@/generated/prisma/enums";

export async function POST(request: Request) {
  try {
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

    if (session.user.role !== "BRAND") {
      return NextResponse.json(
        {
          error: "Only brands can create campaigns",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const {
      title,
      description,
      niche,
      targetLocation,
      deliverablesBrief,
      platforms,
      collaborationType,
      budgetMin,
      budgetMax,
      applicationDeadline,
      startDate,
      endDate,
      status,
    } = body;

    if (
      typeof title !== "string" ||
      !title.trim()
    ) {
      return NextResponse.json(
        {
          error: "Title is required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof description !== "string" ||
      !description.trim()
    ) {
      return NextResponse.json(
        {
          error: "Description is required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof deliverablesBrief !== "string" ||
      !deliverablesBrief.trim()
    ) {
      return NextResponse.json(
        {
          error: "Deliverables brief is required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof niche !== "string" ||
      !Object.values(Niche).includes(niche as Niche)
    ) {
      return NextResponse.json(
        {
          error: "Invalid niche",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof collaborationType !== "string" ||
      !Object.values(CollaborationType).includes(
        collaborationType as CollaborationType
      )
    ) {
      return NextResponse.json(
        {
          error: "Invalid collaboration type",
        },
        {
          status: 400,
        }
      );
    }

    if (!Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        {
          error: "At least one platform is required",
        },
        {
          status: 400,
        }
      );
    }

    const invalidPlatforms = platforms.filter(
      (platform) =>
        typeof platform !== "string" ||
        !Object.values(Platform).includes(
          platform as Platform
        )
    );

    if (invalidPlatforms.length > 0) {
      return NextResponse.json(
        {
          error: "One or more platforms are invalid",
          invalidPlatforms,
        },
        {
          status: 400,
        }
      );
    }

    if (
      budgetMin !== undefined &&
      budgetMin !== null &&
      (!Number.isInteger(Number(budgetMin)) ||
        Number(budgetMin) < 0)
    ) {
      return NextResponse.json(
        {
          error: "budgetMin must be a non-negative integer",
        },
        {
          status: 400,
        }
      );
    }

    if (
      budgetMax !== undefined &&
      budgetMax !== null &&
      (!Number.isInteger(Number(budgetMax)) ||
        Number(budgetMax) < 0)
    ) {
      return NextResponse.json(
        {
          error: "budgetMax must be a non-negative integer",
        },
        {
          status: 400,
        }
      );
    }

    if (
      budgetMin !== undefined &&
      budgetMin !== null &&
      budgetMax !== undefined &&
      budgetMax !== null &&
      Number(budgetMin) > Number(budgetMax)
    ) {
      return NextResponse.json(
        {
          error: "budgetMin cannot be greater than budgetMax",
        },
        {
          status: 400,
        }
      );
    }

    let campaignStatus: CampaignStatus =
      CampaignStatus.DRAFT;

    if (status !== undefined) {
      if (
        typeof status !== "string" ||
        !Object.values(CampaignStatus).includes(
          status as CampaignStatus
        )
      ) {
        return NextResponse.json(
          {
            error: "Invalid campaign status",
          },
          {
            status: 400,
          }
        );
      }

      campaignStatus = status as CampaignStatus;
    }

    const brandProfile =
      await prisma.brandProfile.findUnique({
        where: {
          userId: session.user.id,
        },
      });

    if (!brandProfile) {
      return NextResponse.json(
        {
          error:
            "Brand profile not found for this user",
        },
        {
          status: 404,
        }
      );
    }

    const campaign =
      await prisma.campaign.create({
        data: {
          brandProfileId: brandProfile.id,

          title: title.trim(),

          description: description.trim(),

          niche: niche as Niche,

          targetLocation:
            typeof targetLocation === "string" &&
            targetLocation.trim()
              ? targetLocation.trim()
              : "Hyderabad",

          deliverablesBrief:
            deliverablesBrief.trim(),

          platforms: platforms as Platform[],

          collaborationType:
            collaborationType as CollaborationType,

          status: campaignStatus,

          budgetMin:
            budgetMin !== undefined &&
            budgetMin !== null
              ? Number(budgetMin)
              : null,

          budgetMax:
            budgetMax !== undefined &&
            budgetMax !== null
              ? Number(budgetMax)
              : null,

          applicationDeadline:
            applicationDeadline
              ? new Date(applicationDeadline)
              : null,

          startDate:
            startDate
              ? new Date(startDate)
              : null,

          endDate:
            endDate
              ? new Date(endDate)
              : null,
        },
      });

    return NextResponse.json(
      {
        success: true,
        message: "Campaign created successfully",
        campaign,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Campaign creation failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while creating the campaign",
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET() {
  try {
    const campaigns =
      await prisma.campaign.findMany({
        orderBy: {
          createdAt: "desc",
        },

        include: {
          brandProfile: {
            select: {
              id: true,
              companyName: true,
              city: true,
              verificationStatus: true,
            },
          },
        },
      });

    return NextResponse.json(
      {
        success: true,
        campaigns,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Campaign listing failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong while fetching campaigns",
      },
      {
        status: 500,
      }
    );
  }
}