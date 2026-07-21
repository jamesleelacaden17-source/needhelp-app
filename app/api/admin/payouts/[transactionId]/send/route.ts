import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendPayout, PayMongoError } from "@/lib/paymongo";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/admin/payouts/[transactionId]/send">
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { transactionId } = await ctx.params;

  const [transaction, settings] = await Promise.all([
    prisma.transaction.findUnique({ where: { id: transactionId } }),
    prisma.platformSettings.findUnique({ where: { id: "default" } }),
  ]);

  if (!transaction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (transaction.payoutStatus === "PAID") {
    return NextResponse.json({ error: "This commission has already been paid out" }, { status: 409 });
  }
  if (!settings?.accountNumber || !settings.bankCode) {
    return NextResponse.json(
      { error: "Set up your payout destination first" },
      { status: 409 }
    );
  }

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { payoutStatus: "PENDING" },
  });

  try {
    const transfer = await sendPayout({
      amountPesos: transaction.commissionAmount,
      destinationAccountNumber: settings.accountNumber,
      destinationAccountName: settings.accountName ?? "NeedHelp",
      destinationBic: settings.bankCode,
      provider: "instapay",
      description: `NeedHelp commission — booking ${transaction.bookingId}`,
    });
    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        payoutStatus: transfer.status === "failed" ? "FAILED" : "PAID",
        paymongoTransferId: transfer.id,
        payoutAt: new Date(),
        payoutError: null,
      },
    });
    return NextResponse.json({ transaction: updated });
  } catch (err) {
    const message = err instanceof PayMongoError ? err.message : "Payout failed";
    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: { payoutStatus: "FAILED", payoutError: message },
    });
    return NextResponse.json({ transaction: updated, error: message }, { status: 502 });
  }
}
