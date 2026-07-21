import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "PROVIDER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
  });

  if (!user.isOnline && user.verificationStatus !== "APPROVED") {
    return NextResponse.json(
      { error: "You must complete ID verification before going online" },
      { status: 403 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: { isOnline: !user.isOnline },
  });

  return NextResponse.json({ isOnline: updated.isOnline });
}
