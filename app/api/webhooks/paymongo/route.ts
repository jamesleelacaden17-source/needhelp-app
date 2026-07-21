import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, sendPayout, PayMongoError } from "@/lib/paymongo";

// Recursively hunts a JSON payload for the first value at the given key name.
// Used because we don't hard-pin PayMongo's exact nested event shape here —
// this is deliberately tolerant so minor payload differences don't break us.
function findValueByKey(obj: unknown, key: string): string | undefined {
  if (obj == null || typeof obj !== "object") return undefined;
  const record = obj as Record<string, unknown>;
  if (typeof record[key] === "string") return record[key] as string;
  for (const value of Object.values(record)) {
    if (value && typeof value === "object") {
      const found = findValueByKey(value, key);
      if (found) return found;
    }
  }
  return undefined;
}

async function attemptCommissionPayout(bookingId: string) {
  const [transaction, settings] = await Promise.all([
    prisma.transaction.findUnique({ where: { bookingId } }),
    prisma.platformSettings.findUnique({ where: { id: "default" } }),
  ]);

  if (!transaction || transaction.payoutStatus === "PAID" || transaction.payoutStatus === "PENDING") {
    return; // nothing to do, or already in flight/done
  }
  if (!settings?.accountNumber || !settings.bankCode) {
    return; // admin hasn't configured a payout destination yet
  }

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { payoutStatus: "PENDING" },
  });

  try {
    const transfer = await sendPayout({
      amountPesos: transaction.commissionAmount,
      destinationAccountNumber: settings.accountNumber,
      destinationAccountName: settings.accountName ?? "NeedHelp",
      destinationBic: settings.bankCode,
      provider: "instapay",
      description: `NeedHelp commission — booking ${bookingId}`,
    });
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        payoutStatus: transfer.status === "failed" ? "FAILED" : "PAID",
        paymongoTransferId: transfer.id,
        payoutAt: new Date(),
        payoutError: null,
      },
    });
  } catch (err) {
    const message = err instanceof PayMongoError ? err.message : "Payout failed";
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { payoutStatus: "FAILED", payoutError: message },
    });
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("Paymongo-Signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  const eventType: string | undefined = event?.data?.attributes?.type;

  if (!eventType) {
    return NextResponse.json({ ok: true }); // nothing actionable, acknowledge anyway
  }

  if (eventType.includes("payment.paid") || eventType.includes("checkout_session.payment.paid")) {
    const bookingId = findValueByKey(event, "reference_number");
    const checkoutSessionId = findValueByKey(event.data.attributes, "id");

    const booking = bookingId
      ? await prisma.booking.findUnique({ where: { id: bookingId } })
      : checkoutSessionId
        ? await prisma.booking.findFirst({ where: { paymongoCheckoutSessionId: checkoutSessionId } })
        : null;

    if (booking && booking.paymentStatus !== "PAID") {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: "PAID", paidAt: new Date() },
      });
      await attemptCommissionPayout(booking.id);
    }
  } else if (eventType.includes("payment.failed")) {
    const bookingId = findValueByKey(event, "reference_number");
    if (bookingId) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { paymentStatus: "FAILED" },
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
