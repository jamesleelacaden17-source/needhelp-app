import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isAllowedIdPhotoType, saveIdPhoto, deleteIdPhoto, MAX_ID_PHOTO_BYTES } from "@/lib/storage";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PROVIDER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No photo provided" }, { status: 400 });
  }
  if (file.size > MAX_ID_PHOTO_BYTES) {
    return NextResponse.json({ error: "Photo must be under 5MB" }, { status: 400 });
  }
  if (!isAllowedIdPhotoType(file.type)) {
    return NextResponse.json(
      { error: "Photo must be a JPEG, PNG, or WEBP image" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

  const filename = await saveIdPhoto(session.userId, file);
  if (user.idPhotoPath) {
    await deleteIdPhoto(user.idPhotoPath);
  }

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: {
      idPhotoPath: filename,
      idPhotoSubmittedAt: new Date(),
      verificationStatus: "PENDING",
      rejectionReason: null,
      isOnline: false,
    },
  });

  return NextResponse.json({ verificationStatus: updated.verificationStatus });
}
