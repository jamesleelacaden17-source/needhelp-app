import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createCheckoutSession, isPayMongoConfigured, PayMongoError } from "@/lib/paymongo";

const bodySchema = z.object({ bookingId: z.string() });

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPayMongoConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured yet. Add PAYMONGO_SECRET_KEY to enable real payments." },
      { status: 503 }
    );
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { customer: true },
  });
  if (!booking || booking.customerId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (booking.status !== "COMPLETED") {
    return NextResponse.json({ error: "Booking must be completed before paying" }, { status: 409 });
  }
  if (booking.paymentStatus === "PAID") {
    return NextResponse.json({ error: "This booking is already paid" }, { status: 409 });
  }

  const origin = request.nextUrl.origin;

  try {
    const checkout = await createCheckoutSession({
      bookingId: booking.id,
      serviceLabel: booking.serviceType,
      amountPesos: booking.price,
      customerName: booking.customer.name,
      customerEmail: booking.customer.email,
      successUrl: `${origin}/customer?payment=success`,
      cancelUrl: `${origin}/customer?payment=cancelled`,
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: "PENDING",
        paymongoCheckoutSessionId: checkout.id,
        paymongoCheckoutUrl: checkout.checkoutUrl,
      },
    });

    return NextResponse.json({ checkoutUrl: checkout.checkoutUrl });
  } catch (err) {
    const message = err instanceof PayMongoError ? err.message : "Could not start payment";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
