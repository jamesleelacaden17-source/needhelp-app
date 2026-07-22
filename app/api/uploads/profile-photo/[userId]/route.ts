import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { readProfilePhoto } from "@/lib/storage";

// Public-facing profile photo — unlike the private ID photo, any logged-in
// user may view it (customers need to see the face of the provider assigned
// to their booking).
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/uploads/profile-photo/[userId]">
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId } = await ctx.params;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.profilePhotoPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const photo = await readProfilePhoto(user.profilePhotoPath);
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(photo.buffer), {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
