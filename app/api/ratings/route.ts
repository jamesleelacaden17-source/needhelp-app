import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const ratingSchema = z.object({
  bookingId: z.string(),
  stars: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = ratingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { bookingId, stars, comment } = parsed.data;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { rating: true },
  });

  if (!booking || booking.customerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (booking.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "Booking must be completed before rating" },
      { status: 409 }
    );
  }
  if (booking.rating) {
    return NextResponse.json(
      { error: "This booking has already been rated" },
      { status: 409 }
    );
  }
  if (!booking.providerId) {
    return NextResponse.json({ error: "No provider on this booking" }, { status: 409 });
  }

  const [rating] = await prisma.$transaction([
    prisma.rating.create({
      data: {
        bookingId,
        customerId: session.userId,
        providerId: booking.providerId,
        stars,
        comment,
      },
    }),
    prisma.user.update({
      where: { id: booking.providerId },
      data: {
        ratingSum: { increment: stars },
        ratingCount: { increment: 1 },
      },
    }),
  ]);

  return NextResponse.json({ rating });
}
