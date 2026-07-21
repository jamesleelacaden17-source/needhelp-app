import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isPayMongoConfigured } from "@/lib/paymongo";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.platformSettings.findUnique({ where: { id: "default" } });
  return NextResponse.json({ settings, paymongoConfigured: isPayMongoConfigured() });
}

const settingsSchema = z.object({
  payoutDestinationType: z.enum(["BANK", "GCASH"]),
  accountNumber: z.string().min(4),
  accountName: z.string().min(1),
  bankCode: z.string().min(1),
  bankLabel: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = settingsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const settings = await prisma.platformSettings.upsert({
    where: { id: "default" },
    update: parsed.data,
    create: { id: "default", ...parsed.data },
  });

  return NextResponse.json({ settings });
}
