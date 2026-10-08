import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DeliverableStatus } from "@/generated/prisma/enums";

type RouteContext = {
  params: Promise<{ id: string; deliverableId: string }>;
};

const REVIEW_STATUSES = [
  DeliverableStatus.APPROVED,
  DeliverableStatus.REVISION_REQUESTED,
] as const;

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
        { error: "Only brands can review deliverables" },
        { status: 403 }
      );
    }

    const { id: campaignId, deliverableId } = await params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "A valid JSON request body is required" },
        { status: 400 }
      );
    }

    const status = body.status;
    const reviewNotes =
      typeof body.reviewNotes === "string"
        ? body.reviewNotes.trim()
        : undefined;

    if (
      typeof status !== "string" ||
      !REVIEW_STATUSES.includes(
        status as (typeof REVIEW_STATUSES)[number]
      )
    ) {
      return NextResponse.json(
        { error: "Status must be APPROVED or REVISION_REQUESTED" },
        { status: 400 }
      );
    }

    if (reviewNotes !== undefined && reviewNotes.length > 5000) {
      return NextResponse.json(
        { error: "reviewNotes must be 5000 characters or fewer" },
        { status: 400 }
      );
    }

    if (status === DeliverableStatus.REVISION_REQUESTED && !reviewNotes) {
      return NextResponse.json(
        { error: "Review notes are required when requesting revisions" },
        { status: 400 }
      );
    }

    const deliverable = await prisma.deliverable.findFirst({
      where: {
        id: deliverableId,
        campaignId,
      },
      include: {
        campaign: {
          select: {
            brandProfile: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!deliverable) {
      return NextResponse.json(
        { error: "Deliverable not found for this campaign" },
        { status: 404 }
      );
    }

    if (deliverable.campaign.brandProfile.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You are not authorized to review this deliverable" },
        { status: 403 }
      );
    }

    if (
      deliverable.status !== DeliverableStatus.SUBMITTED &&
      deliverable.status !== DeliverableStatus.REVISION_REQUESTED
    ) {
      return NextResponse.json(
        {
          error: "Only submitted deliverables or requested revisions can be reviewed",
          currentStatus: deliverable.status,
        },
        { status: 409 }
      );
    }

    const updatedDeliverable = await prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        status:status as (typeof REVIEW_STATUSES)[number],
        reviewNotes: reviewNotes || null,
        ...(status === DeliverableStatus.APPROVED
          ? { approvedAt: new Date() }
          : { approvedAt: null }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          status === DeliverableStatus.APPROVED
            ? "Deliverable approved successfully"
            : "Revision requested successfully",
        deliverable: updatedDeliverable,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Deliverable review failed:", error);

    return NextResponse.json(
      { error: "Something went wrong while reviewing the deliverable" },
      { status: 500 }
    );
  }
}
