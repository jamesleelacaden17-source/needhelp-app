import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { PLATFORM_COMMISSION_RATE, calculateTravelFee } from "@/lib/config";
import { findAvailableProvider, parseDeclinedIds, addDeclinedId } from "@/lib/matching";
import { haversineDistanceKm } from "@/lib/geo";

const updateSchema = z.object({
  action: z.enum(["accept", "decline", "start", "complete", "cancel"]),
});

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/bookings/[id]">
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true } },
      provider: { select: { id: true, name: true } },
      transaction: true,
      rating: true,
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isParticipant =
    booking.customerId === session.userId || booking.providerId === session.userId;
  if (!isParticipant && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ booking });
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/bookings/[id]">
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { action } = parsed.data;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "accept") {
    if (session.role !== "PROVIDER" || booking.providerId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (booking.status !== "PENDING") {
      return NextResponse.json(
        { error: "This request is no longer pending" },
        { status: 409 }
      );
    }
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "ASSIGNED", assignedAt: new Date() },
    });
    return NextResponse.json({ booking: updated });
  }

  if (action === "decline") {
    if (session.role !== "PROVIDER" || booking.providerId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (booking.status !== "PENDING") {
      return NextResponse.json(
        { error: "This request is no longer pending" },
        { status: 409 }
      );
    }
    const declinedProviderIds = addDeclinedId(booking.declinedProviderIds, session.userId);
    const nextProvider = await findAvailableProvider(
      booking.category,
      parseDeclinedIds(declinedProviderIds)
    );

    // Re-price against the newly-matched provider's distance — a decline
    // can hand the job to someone at a very different distance, so the
    // travel fee (and total price) needs to be recalculated, not carried
    // over from the provider who just declined.
    const basePrice = booking.price - (booking.travelFee ?? 0);
    let distanceKm: number | null = null;
    let travelFee = 0;
    if (nextProvider?.lastLat != null && nextProvider?.lastLng != null) {
      distanceKm = haversineDistanceKm(
        nextProvider.lastLat,
        nextProvider.lastLng,
        booking.customerLat,
        booking.customerLng
      );
      travelFee = calculateTravelFee(distanceKm);
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        declinedProviderIds,
        providerId: nextProvider?.id ?? null,
        status: nextProvider ? "PENDING" : "NO_PROVIDERS_AVAILABLE",
        price: nextProvider ? basePrice + travelFee : basePrice,
        distanceKm: nextProvider ? distanceKm : null,
        travelFee: nextProvider ? travelFee : null,
      },
    });
    return NextResponse.json({ booking: updated });
  }

  if (action === "start") {
    if (session.role !== "PROVIDER" || booking.providerId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (booking.status !== "ASSIGNED") {
      return NextResponse.json(
        { error: "Booking is not in an assignable state" },
        { status: 409 }
      );
    }
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });
    return NextResponse.json({ booking: updated });
  }

  if (action === "complete") {
    if (session.role !== "PROVIDER" || booking.providerId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (booking.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Booking must be in progress to complete" },
        { status: 409 }
      );
    }

    // The platform takes commission only on the base service price — the
    // provider keeps 100% of the travel fee as fair compensation for
    // distance, on top of their share of the base price.
    const travelFee = booking.travelFee ?? 0;
    const baseForCommission = booking.price - travelFee;
    const commissionAmount =
      Math.round(baseForCommission * PLATFORM_COMMISSION_RATE * 100) / 100;
    const providerPayout = Math.round((booking.price - commissionAmount) * 100) / 100;

    const [updated] = await prisma.$transaction([
      prisma.booking.update({
        where: { id },
        data: { status: "COMPLETED", completedAt: new Date() },
      }),
      prisma.transaction.create({
        data: {
          bookingId: id,
          amount: booking.price,
          commissionRate: PLATFORM_COMMISSION_RATE,
          commissionAmount,
          providerPayout,
        },
      }),
    ]);

    return NextResponse.json({ booking: updated });
  }

  if (action === "cancel") {
    const isCustomer = session.role === "CUSTOMER" && booking.customerId === session.userId;
    const isProvider = session.role === "PROVIDER" && booking.providerId === session.userId;
    if (!isCustomer && !isProvider && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Booking can no longer be cancelled" },
        { status: 409 }
      );
    }
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    return NextResponse.json({ booking: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
