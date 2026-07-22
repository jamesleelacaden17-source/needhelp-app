import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSuperBadge, type Gender } from "@/lib/config";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  const avgRating = user.ratingCount > 0 ? user.ratingSum / user.ratingCount : null;
  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isOnline: user.isOnline,
      avgRating,
      ratingCount: user.ratingCount,
      verificationStatus: user.verificationStatus,
      rejectionReason: user.rejectionReason,
      providerCategory: user.providerCategory,
      gender: user.gender,
      profilePhotoPath: user.profilePhotoPath,
      superBadge: getSuperBadge(user.gender as Gender | null, avgRating, user.ratingCount),
    },
  });
}
