import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providers = await prisma.user.findMany({
    where: { role: "PROVIDER", verificationStatus: { in: ["PENDING", "REJECTED"] } },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      providerCategory: true,
      verificationStatus: true,
      idPhotoSubmittedAt: true,
      profilePhotoPath: true,
      rejectionReason: true,
    },
    orderBy: { idPhotoSubmittedAt: "asc" },
  });

  return NextResponse.json({ providers });
}
