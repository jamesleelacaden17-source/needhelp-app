import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  SERVICE_TYPES,
  calculateBookingPrice,
  calculateTravelFee,
  MIN_HOURS,
  MAX_HOURS,
  toPublicProvider,
} from "@/lib/config";
import { PROVIDER_SELECT, findAvailableProvider } from "@/lib/matching";
import { haversineDistanceKm } from "@/lib/geo";

const SERVICE_TYPE_IDS = SERVICE_TYPES.map((s) => s.id) as [string, ...string[]];
const MIN_SCHEDULE_LEAD_MINUTES = 15;

const createBookingSchema = z
  .object({
    serviceType: z.enum(SERVICE_TYPE_IDS),
    address: z.string().min(3),
    customerLat: z.number().min(-90).max(90),
    customerLng: z.number().min(-180).max(180),
    propertyType: z.enum(["studio", "1br", "2br", "house"]).optional(),
    hours: z.number().min(MIN_HOURS).max(MAX_HOURS).optional(),
    quantity: z.number().min(0.5).max(50).optional(),
    notes: z.string().optional(),
    scheduledFor: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      const service = SERVICE_TYPES.find((s) => s.id === data.serviceType);
      if (!service) return false;
      if (service.pricingMode === "tieredFlat") return !!data.propertyType;
      if (service.pricingMode === "hourly") return data.hours != null;
      if (service.pricingMode === "perUnit") return data.quantity != null;
      return true; // flat
    },
    { message: "Missing required details for this service" }
  );

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const {
    serviceType,
    address,
    customerLat,
    customerLng,
    propertyType,
    hours,
    quantity,
    notes,
    scheduledFor,
  } = parsed.data;

  if (scheduledFor) {
    const minTime = Date.now() + MIN_SCHEDULE_LEAD_MINUTES * 60 * 1000;
    if (new Date(scheduledFor).getTime() < minTime) {
      return NextResponse.json(
        { error: `Requested arrival time must be at least ${MIN_SCHEDULE_LEAD_MINUTES} minutes from now` },
        { status: 400 }
      );
    }
  }

  const service = SERVICE_TYPES.find((s) => s.id === serviceType);
  if (!service) {
    return NextResponse.json({ error: "Unknown service type" }, { status: 400 });
  }
  const quote = calculateBookingPrice(serviceType, { propertyType, hours, quantity });
  if (!quote) {
    return NextResponse.json({ error: "Could not price this booking" }, { status: 400 });
  }

  const provider = await findAvailableProvider(service.category);

  let distanceKm: number | null = null;
  let travelFee = 0;
  if (provider?.lastLat != null && provider?.lastLng != null) {
    distanceKm = haversineDistanceKm(provider.lastLat, provider.lastLng, customerLat, customerLng);
    travelFee = calculateTravelFee(distanceKm);
  }

  const booking = await prisma.booking.create({
    data: {
      customerId: session.userId,
      providerId: provider?.id ?? null,
      status: provider ? "PENDING" : "NO_PROVIDERS_AVAILABLE",
      category: service.category,
      serviceType: service.label,
      address,
      customerLat,
      customerLng,
      propertyType: service.pricingMode === "tieredFlat" ? propertyType : null,
      hours: service.pricingMode === "hourly" ? hours : null,
      quantity: service.pricingMode === "perUnit" ? quantity : null,
      estimatedHours: quote.estimatedHours,
      price: quote.price + travelFee,
      distanceKm,
      travelFee,
      notes,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
    },
    include: { provider: { select: PROVIDER_SELECT } },
  });

  return NextResponse.json({
    booking: { ...booking, provider: booking.provider ? toPublicProvider(booking.provider) : null },
  });
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where =
    session.role === "CUSTOMER"
      ? { customerId: session.userId }
      : session.role === "PROVIDER"
        ? { providerId: session.userId }
        : {};

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true } },
      provider: { select: PROVIDER_SELECT },
      transaction: true,
      rating: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      ...b,
      provider: b.provider ? toPublicProvider(b.provider) : null,
    })),
  });
}
