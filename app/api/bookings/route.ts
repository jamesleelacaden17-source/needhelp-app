import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { SERVICE_TYPES, calculateBookingPrice, MIN_HOURS, MAX_HOURS } from "@/lib/config";

const ACTIVE_STATUSES = ["ASSIGNED", "IN_PROGRESS"] as const;
const SERVICE_TYPE_IDS = SERVICE_TYPES.map((s) => s.id) as [string, ...string[]];

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

async function findAvailableProvider(category: string) {
  const candidates = await prisma.user.findMany({
    where: {
      role: "PROVIDER",
      providerCategory: category as never,
      isOnline: true,
      verificationStatus: "APPROVED",
      bookingsAsProvider: {
        none: { status: { in: [...ACTIVE_STATUSES] } },
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
  const { serviceType, address, customerLat, customerLng, propertyType, hours, quantity, notes } =
    parsed.data;

  const service = SERVICE_TYPES.find((s) => s.id === serviceType);
  if (!service) {
    return NextResponse.json({ error: "Unknown service type" }, { status: 400 });
  }
  const quote = calculateBookingPrice(serviceType, { propertyType, hours, quantity });
  if (!quote) {
    return NextResponse.json({ error: "Could not price this booking" }, { status: 400 });
  }

  const provider = await findAvailableProvider(service.category);

  const booking = await prisma.booking.create({
    data: {
      customerId: session.userId,
      providerId: provider?.id ?? null,
      status: provider ? "ASSIGNED" : "NO_PROVIDERS_AVAILABLE",
      category: service.category,
      serviceType: service.label,
      address,
      customerLat,
      customerLng,
      propertyType: service.pricingMode === "tieredFlat" ? propertyType : null,
      hours: service.pricingMode === "hourly" ? hours : null,
      quantity: service.pricingMode === "perUnit" ? quantity : null,
      estimatedHours: quote.estimatedHours,
      price: quote.price,
      notes,
      assignedAt: provider ? new Date() : null,
    },
    include: { provider: true },
  });

  return NextResponse.json({ booking });
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
      provider: {
        select: { id: true, name: true, lastLat: true, lastLng: true, lastLocationAt: true },
      },
      transaction: true,
      rating: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ bookings });
}
