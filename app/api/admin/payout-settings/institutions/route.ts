import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getReceivingInstitutions, isPayMongoConfigured, PayMongoError } from "@/lib/paymongo";

// Lets the admin UI look up valid bank/e-wallet codes (e.g. GCash) to store as bankCode/bankLabel.
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPayMongoConfigured()) {
    return NextResponse.json({ error: "PayMongo is not configured" }, { status: 503 });
  }

  try {
    const institutions = await getReceivingInstitutions("instapay");
    return NextResponse.json({
      institutions: institutions.map((i) => ({ code: i.attributes.bic, label: i.attributes.name })),
    });
  } catch (err) {
    const message = err instanceof PayMongoError ? err.message : "Could not fetch institutions";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
