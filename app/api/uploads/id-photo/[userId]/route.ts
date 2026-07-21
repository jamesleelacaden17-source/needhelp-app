import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { readIdPhoto } from "@/lib/storage";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/uploads/id-photo/[userId]">
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId } = await ctx.params;

  if (session.role !== "ADMIN" && session.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.idPhotoPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const photo = await readIdPhoto(user.idPhotoPath);
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(photo.buffer), {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "private, no-store",
    },
  });
}
