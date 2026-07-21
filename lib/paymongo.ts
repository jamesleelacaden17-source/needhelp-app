import crypto from "crypto";

const API_BASE = "https://api.paymongo.com";

function secretKey(): string {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new Error("PAYMONGO_SECRET_KEY is not configured");
  return key;
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${secretKey()}:`).toString("base64")}`;
}

function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

export class PayMongoError extends Error {
  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "PayMongoError";
  }
}

const WALLET_NOT_ENABLED_MESSAGE =
  "Payouts aren't available on this PayMongo account yet. Sending money out (to a bank or GCash) " +
  "requires PayMongo's 'wallet enablement' review, which needs your business verification (M2 status) " +
  "to be complete — submit your business documents in the PayMongo dashboard once your sole " +
  "proprietorship registration is done. Accepting customer payments already works without this.";

async function paymongoFetch(path: string, init: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const rawDetail: string | undefined = body?.errors?.[0]?.detail;
    const isWalletTransferPath = path.includes("/transfers") || path.includes("batch_transfers");
    const message =
      isWalletTransferPath && res.status === 404
        ? WALLET_NOT_ENABLED_MESSAGE
        : (rawDetail ?? body?.error ?? `PayMongo request failed (${res.status})`);
    throw new PayMongoError(message, body);
  }
  return body;
}

export async function createCheckoutSession(params: {
  bookingId: string;
  serviceLabel: string;
  amountPesos: number;
  customerName: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const body = await paymongoFetch("/v1/checkout_sessions", {
    method: "POST",
    body: JSON.stringify({
      data: {
        attributes: {
          billing: { name: params.customerName, email: params.customerEmail },
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          description: `NeedHelp booking ${params.bookingId}`,
          cancel_url: params.cancelUrl,
          success_url: params.successUrl,
          reference_number: params.bookingId,
          line_items: [
            {
              currency: "PHP",
              amount: pesosToCentavos(params.amountPesos),
              name: params.serviceLabel,
              quantity: 1,
            },
          ],
          payment_method_types: ["gcash", "card", "paymaya"],
        },
      },
    }),
  });

  return {
    id: body.data.id as string,
    checkoutUrl: body.data.attributes.checkout_url as string,
  };
}

export async function getReceivingInstitutions(provider: "instapay" | "pesonet" = "instapay") {
  const body = await paymongoFetch(
    `/v2/transfers/receiving_institutions?provider=${provider}`,
    { method: "GET" }
  );
  return (body.data ?? []) as { id: string; attributes: { name: string; bic: string } }[];
}

export async function sendPayout(params: {
  amountPesos: number;
  destinationAccountNumber: string;
  destinationAccountName: string;
  destinationBic: string;
  provider: "instapay" | "pesonet";
  description: string;
  callbackUrl?: string;
}) {
  const body = await paymongoFetch("/v2/batch_transfers", {
    method: "POST",
    body: JSON.stringify({
      transfers: [
        {
          destination_account: {
            number: params.destinationAccountNumber,
            name: params.destinationAccountName,
            bic: params.destinationBic,
          },
          amount: pesosToCentavos(params.amountPesos),
          currency: "PHP",
          provider: params.provider,
          description: params.description,
          callback_url: params.callbackUrl,
        },
      ],
    }),
  });

  const transfer = body.transfers?.[0];
  if (!transfer) {
    throw new PayMongoError("PayMongo did not return a transfer result", body);
  }
  return { id: transfer.id as string, status: transfer.status as string };
}

/**
 * Verifies the `Paymongo-Signature` header PayMongo sends with every webhook.
 * Format: "t=<timestamp>,te=<test-mode hmac>,li=<live-mode hmac>"
 * The hmac is SHA-256(webhookSecret, `${t}.${rawBody}`), hex-encoded.
 * Must run against the raw (unparsed) request body.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!webhookSecret || !signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((pair) => {
      const [key, value] = pair.split("=");
      return [key, value];
    })
  );
  const timestamp = parts.t;
  const candidateSignature = parts.te ?? parts.li;
  if (!timestamp || !candidateSignature) return false;

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expected);
  const candidateBuf = Buffer.from(candidateSignature);
  if (expectedBuf.length !== candidateBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, candidateBuf);
}

export function isPayMongoConfigured(): boolean {
  return !!process.env.PAYMONGO_SECRET_KEY;
}
