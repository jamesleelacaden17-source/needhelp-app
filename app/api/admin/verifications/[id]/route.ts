import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/admin/verifications/[id]">
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const body = await request.json();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { action, reason } = parsed.data;

  const provider = await prisma.user.findUnique({ where: { id } });
  if (!provider || provider.role !== "PROVIDER") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (action === "approve") {
    if (!provider.idPhotoPath) {
      return NextResponse.json({ error: "No ID photo submitted" }, { status: 409 });
    }
    if (!provider.profilePhotoPath) {
      return NextResponse.json(
        { error: "Provider hasn't uploaded a profile photo yet" },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data:
      action === "approve"
        ? {
            verificationStatus: "APPROVED",
            verifiedAt: new Date(),
            verifiedById: session.userId,
            rejectionReason: null,
          }
        : {
            verificationStatus: "REJECTED",
            verifiedAt: new Date(),
            verifiedById: session.userId,
            rejectionReason: reason ?? "ID photo did not pass verification",
            isOnline: false,
          },
  });

  return NextResponse.json({ verificationStatus: updated.verificationStatus });
}
