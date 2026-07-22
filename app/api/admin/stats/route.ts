import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getSuperBadge, type Gender } from "@/lib/config";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [transactions, bookingCounts, providers, customers] = await Promise.all([
    prisma.transaction.findMany({
      include: {
        booking: {
          include: {
            customer: { select: { name: true } },
            provider: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.user.findMany({
      where: { role: "PROVIDER" },
      select: {
        id: true,
        name: true,
        isOnline: true,
        ratingSum: true,
        ratingCount: true,
        verificationStatus: true,
        providerCategory: true,
        gender: true,
        profilePhotoPath: true,
      },
    }),
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        bookingsAsCustomer: {
          select: { price: true, status: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalCommission = transactions.reduce((sum, t) => sum + t.commissionAmount, 0);
  const totalPayout = transactions.reduce((sum, t) => sum + t.providerPayout, 0);
  const commissionPaidOut = transactions
    .filter((t) => t.payoutStatus === "PAID")
    .reduce((sum, t) => sum + t.commissionAmount, 0);

  return NextResponse.json({
    totalRevenue,
    totalCommission,
    totalPayout,
    commissionPaidOut,
    transactionCount: transactions.length,
    bookingCounts,
    transactions,
    providers: providers.map((p) => {
      const avgRating = p.ratingCount > 0 ? p.ratingSum / p.ratingCount : null;
      return {
        ...p,
        avgRating,
        superBadge: getSuperBadge(p.gender as Gender | null, avgRating, p.ratingCount),
      };
    }),
    customers: customers.map((c) => {
      const { bookingsAsCustomer, ...rest } = c;
      const completedBookings = bookingsAsCustomer.filter((b) => b.status === "COMPLETED");
      const lastBookingAt = bookingsAsCustomer.reduce<Date | null>(
        (latest, b) => (!latest || b.createdAt > latest ? b.createdAt : latest),
        null
      );
      return {
        ...rest,
        totalBookings: bookingsAsCustomer.length,
        totalSpent: completedBookings.reduce((sum, b) => sum + b.price, 0),
        lastBookingAt,
      };
    }),
  });
}
