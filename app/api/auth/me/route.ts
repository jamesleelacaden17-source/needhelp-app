import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isOnline: user.isOnline,
      avgRating: user.ratingCount > 0 ? user.ratingSum / user.ratingCount : null,
      verificationStatus: user.verificationStatus,
      rejectionReason: user.rejectionReason,
      providerCategory: user.providerCategory,
    },
  });
}
