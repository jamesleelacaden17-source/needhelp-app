import { prisma } from "@/lib/prisma";

// A provider is unavailable for a new offer if they have any booking that's
// still pending their response or actively in progress.
const BUSY_STATUSES = ["PENDING", "ASSIGNED", "IN_PROGRESS"] as const;

export const PROVIDER_SELECT = {
  id: true,
  name: true,
  lastLat: true,
  lastLng: true,
  lastLocationAt: true,
  verificationStatus: true,
  profilePhotoPath: true,
  gender: true,
  ratingSum: true,
  ratingCount: true,
} as const;

export async function findAvailableProvider(category: string, excludeProviderIds: string[] = []) {
  const candidates = await prisma.user.findMany({
    where: {
      role: "PROVIDER",
      providerCategory: category as never,
      isOnline: true,
      verificationStatus: "APPROVED",
      ...(excludeProviderIds.length > 0 ? { id: { notIn: excludeProviderIds } } : {}),
      bookingsAsProvider: {
        none: { status: { in: [...BUSY_STATUSES] } },
      },
    },
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const avgA = a.ratingCount > 0 ? a.ratingSum / a.ratingCount : 0;
    const avgB = b.ratingCount > 0 ? b.ratingSum / b.ratingCount : 0;
    return avgB - avgA;
  });

  return candidates[0];
}

export function parseDeclinedIds(declinedProviderIds: string): string[] {
  return declinedProviderIds
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function addDeclinedId(declinedProviderIds: string, id: string): string {
  const ids = parseDeclinedIds(declinedProviderIds);
  if (!ids.includes(id)) ids.push(id);
  return ids.join(",");
}
