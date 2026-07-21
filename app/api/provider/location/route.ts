import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PROVIDER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = locationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      lastLat: parsed.data.lat,
      lastLng: parsed.data.lng,
      lastLocationAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
