"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CURRENCY_SYMBOL, PROVIDER_CATEGORIES } from "@/lib/config";
import { VerifiedBadge, SuperBadge, ProviderAvatar } from "@/app/components/Badges";

const CATEGORY_LABEL = Object.fromEntries(PROVIDER_CATEGORIES.map((c) => [c.id, c.label]));

type Stats = {
  totalRevenue: number;
  totalCommission: number;
  totalPayout: number;
  commissionPaidOut: number;
  transactionCount: number;
  bookingCounts: { status: string; _count: { _all: number } }[];
  transactions: {
    id: string;
    amount: number;
    commissionAmount: number;
    providerPayout: number;
    payoutStatus: string;
    payoutError: string | null;
    createdAt: string;
    booking: { serviceType: string; customer: { name: string }; provider: { name: string } | null };
  }[];
  providers: {
    id: string;
    name: string;
    isOnline: boolean;
    ratingCount: number;
    avgRating: number | null;
    verificationStatus: string;
    providerCategory: string;
    profilePhotoPath: string | null;
    superBadge: string | null;
  }[];
};

type PayoutSettings = {
  payoutDestinationType: "BANK" | "GCASH" | null;
  accountNumber: string | null;
  accountName: string | null;
  bankCode: string | null;
  bankLabel: string | null;
} | null;

type VerificationProvider = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  providerCategory: string;
  verificationStatus: string;
  idPhotoSubmittedAt: string | null;
  profilePhotoPath: string | null;
  rejectionReason: string | null;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [verifications, setVerifications] = useState<VerificationProvider[] | null>(null);
  const [payoutSettings, setPayoutSettings] = useState<PayoutSettings>(null);
  const [paymongoConfigured, setPaymongoConfigured] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const loadVerifications = () => {
    fetch("/api/admin/verifications")
      .then((r) => r.json())
      .then((d) => setVerifications(d.providers));
  };

  const loadStats = () => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats);
  };

  const loadPayoutSettings = () => {
    fetch("/api/admin/payout-settings")
      .then((r) => r.json())
      .then((d) => {
        setPayoutSettings(d.settings);
        setPaymongoConfigured(d.paymongoConfigured);
      });
  };

  const refreshAfterDecision = () => {
    loadVerifications();
    loadStats();
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) {
          router.push("/login");
          return;
        }
        if (d.user.role !== "ADMIN") {
          setForbidden(true);
          return;
        }
        loadStats();
        loadVerifications();
        loadPayoutSettings();
      });
  }, [router]);

  if (forbidden) {
    return (
      <main className="mx-auto max-w-3xl flex-1 px-6 py-10">
        <p className="text-zinc-600">You need an admin account to view this page.</p>
      </main>
    );
  }

  if (!stats) return null;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-ink-950">Platform overview</h1>
      <p className="mt-1 text-sm text-zinc-500">Commission earned on every completed job.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total revenue" value={`${CURRENCY_SYMBOL}${stats.totalRevenue.toFixed(2)}`} />
        <Stat
          label="Platform commission"
          value={`${CURRENCY_SYMBOL}${stats.totalCommission.toFixed(2)}`}
          highlight
        />
        <Stat
          label="Commission paid to you"
          value={`${CURRENCY_SYMBOL}${stats.commissionPaidOut.toFixed(2)}`}
        />
        <Stat label="Completed jobs" value={String(stats.transactionCount)} />
      </div>

      <PayoutSettingsPanel
        settings={payoutSettings}
        paymongoConfigured={paymongoConfigured}
        onSaved={loadPayoutSettings}
      />

      {verifications && verifications.length > 0 && (
        <section className="mt-8">
          <h2 className="font-semibold text-zinc-900">
            ID verification queue{" "}
            <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {verifications.length}
            </span>
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {verifications.map((p) => (
              <VerificationCard key={p.id} provider={p} onDecided={refreshAfterDecision} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-semibold text-zinc-900">Bookings by status</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {stats.bookingCounts.map((b) => (
            <span
              key={b.status}
              className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700"
            >
              {b.status}: {b._count._all}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold text-zinc-900">Providers</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Verification</th>
                <th className="px-4 py-2 font-medium">Rating</th>
              </tr>
            </thead>
            <tbody>
              {stats.providers.map((p) => (
                <tr key={p.id} className="border-t border-zinc-100">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <ProviderAvatar providerId={p.id} name={p.name} hasPhoto={!!p.profilePhotoPath} size={28} />
                      <span>{p.name}</span>
                      {p.superBadge && <SuperBadge label={p.superBadge} />}
                    </div>
                  </td>
                  <td className="px-4 py-2">{CATEGORY_LABEL[p.providerCategory] ?? p.providerCategory}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.isOnline ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {p.isOnline ? "Online" : "Offline"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <VerificationBadge status={p.verificationStatus} />
                  </td>
                  <td className="px-4 py-2">
                    {p.avgRating != null ? `★ ${p.avgRating.toFixed(1)} (${p.ratingCount})` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 mb-16">
        <h2 className="font-semibold text-zinc-900">Recent transactions</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Job</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Provider</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Commission</th>
                <th className="px-4 py-2 font-medium">Payout to you</th>
              </tr>
            </thead>
            <tbody>
              {stats.transactions.map((t) => (
                <tr key={t.id} className="border-t border-zinc-100">
                  <td className="px-4 py-2">{t.booking.serviceType}</td>
                  <td className="px-4 py-2">{t.booking.customer.name}</td>
                  <td className="px-4 py-2">{t.booking.provider?.name ?? "—"}</td>
                  <td className="px-4 py-2">{CURRENCY_SYMBOL}{t.amount.toFixed(2)}</td>
                  <td className="px-4 py-2 font-medium text-brand-700">
                    {CURRENCY_SYMBOL}{t.commissionAmount.toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    <PayoutCell transaction={t} canRetry={!!payoutSettings?.accountNumber} onSent={loadStats} />
                  </td>
                </tr>
              ))}
              {stats.transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">
                    No completed jobs yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function VerificationBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    APPROVED: "bg-green-100 text-green-700",
    PENDING: "bg-amber-100 text-amber-700",
    REJECTED: "bg-red-100 text-red-700",
    UNSUBMITTED: "bg-zinc-100 text-zinc-500",
  };
  const labels: Record<string, string> = {
    APPROVED: "Verified",
    PENDING: "Pending review",
    REJECTED: "Rejected",
    UNSUBMITTED: "Not submitted",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.UNSUBMITTED}`}>
      {labels[status] ?? status}
    </span>
  );
}

function VerificationCard({
  provider,
  onDecided,
}: {
  provider: VerificationProvider;
  onDecided: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(action: "approve" | "reject") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/verifications/${provider.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: reason || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not update verification");
      return;
    }
    onDecided();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start">
      <div className="flex gap-2">
        <div className="flex flex-col items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/uploads/id-photo/${provider.id}`}
            alt={`${provider.name}'s ID`}
            className="h-28 w-32 rounded-lg border border-zinc-200 object-cover"
          />
          <span className="text-[10px] font-medium text-zinc-400">Government ID (private)</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          {provider.profilePhotoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/uploads/profile-photo/${provider.id}`}
              alt={`${provider.name}'s profile photo`}
              className="h-28 w-28 rounded-lg border border-zinc-200 object-cover"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-lg border border-dashed border-amber-300 bg-amber-50 text-center text-[11px] text-amber-700">
              No profile photo yet
            </div>
          )}
          <span className="text-[10px] font-medium text-zinc-400">Public profile photo</span>
        </div>
      </div>
      <div className="flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium text-zinc-900">
            {provider.name}{" "}
            <span className="font-normal text-zinc-400">
              · {CATEGORY_LABEL[provider.providerCategory] ?? provider.providerCategory}
            </span>
          </span>
          <span className="shrink-0">
            <VerificationBadge status={provider.verificationStatus} />
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-500">{provider.email}</p>
        {provider.phone && <p className="text-sm text-zinc-500">{provider.phone}</p>}
        {provider.rejectionReason && (
          <p className="mt-1 text-sm text-red-600">Previous reason: {provider.rejectionReason}</p>
        )}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

        {showRejectForm ? (
          <div className="mt-3 flex flex-col gap-2">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for rejection"
              className="input"
            />
            <div className="flex gap-2">
              <button
                onClick={() => decide("reject")}
                disabled={busy}
                className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                Confirm reject
              </button>
              <button
                onClick={() => setShowRejectForm(false)}
                className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => decide("approve")}
              disabled={busy}
              className="rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              Approve
            </button>
            <button
              onClick={() => setShowRejectForm(true)}
              disabled={busy}
              className="rounded-full border border-red-300 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PayoutCell({
  transaction,
  canRetry,
  onSent,
}: {
  transaction: { id: string; payoutStatus: string; payoutError: string | null };
  canRetry: boolean;
  onSent: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function retry() {
    setBusy(true);
    await fetch(`/api/admin/payouts/${transaction.id}/send`, { method: "POST" });
    setBusy(false);
    onSent();
  }

  if (transaction.payoutStatus === "PAID") {
    return <span className="text-sm font-medium text-green-700">✓ Sent</span>;
  }
  if (transaction.payoutStatus === "PENDING") {
    return <span className="text-sm text-amber-600">Sending…</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-500">
        {transaction.payoutStatus === "FAILED" ? "Failed" : "Not sent"}
      </span>
      {canRetry && (
        <button
          onClick={retry}
          disabled={busy}
          className="text-xs font-medium text-brand-700 hover:underline disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send now"}
        </button>
      )}
      {transaction.payoutError && (
        <span className="text-xs text-red-600" title={transaction.payoutError}>
          ⚠
        </span>
      )}
    </div>
  );
}

type Institution = { code: string; label: string };

function PayoutSettingsPanel({
  settings,
  paymongoConfigured,
  onSaved,
}: {
  settings: PayoutSettings;
  paymongoConfigured: boolean;
  onSaved: () => void;
}) {
  const [destinationType, setDestinationType] = useState<"BANK" | "GCASH">(
    settings?.payoutDestinationType ?? "GCASH"
  );
  const [accountNumber, setAccountNumber] = useState(settings?.accountNumber ?? "");
  const [accountName, setAccountName] = useState(settings?.accountName ?? "");
  const [bankCode, setBankCode] = useState(settings?.bankCode ?? "");
  const [bankLabel, setBankLabel] = useState(settings?.bankLabel ?? "");
  const [institutions, setInstitutions] = useState<Institution[] | null>(null);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function loadInstitutions() {
    setLoadingInstitutions(true);
    setError(null);
    const res = await fetch("/api/admin/payout-settings/institutions");
    const data = await res.json();
    setLoadingInstitutions(false);
    if (!res.ok) {
      setError(data.error ?? "Could not load institutions");
      return;
    }
    setInstitutions(data.institutions);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/admin/payout-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payoutDestinationType: destinationType,
        accountNumber,
        accountName,
        bankCode,
        bankLabel,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save settings");
      return;
    }
    setSaved(true);
    onSaved();
  }

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-4">
      <h2 className="font-semibold text-zinc-900">Where your commission gets paid</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Set the bank account or GCash number that receives your platform commission automatically
        after each customer payment.
      </p>

      {!paymongoConfigured && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          PayMongo isn&apos;t configured yet (missing PAYMONGO_SECRET_KEY). Payouts will stay queued
          until it&apos;s set up.
        </p>
      )}

      <form onSubmit={save} className="mt-4 flex flex-col gap-3">
        <div className="flex rounded-full border border-zinc-300 bg-zinc-50 p-1 text-sm font-medium w-fit">
          <button
            type="button"
            onClick={() => setDestinationType("GCASH")}
            className={`rounded-full px-4 py-1.5 ${destinationType === "GCASH" ? "bg-brand-600 text-white" : "text-zinc-600"}`}
          >
            GCash
          </button>
          <button
            type="button"
            onClick={() => setDestinationType("BANK")}
            className={`rounded-full px-4 py-1.5 ${destinationType === "BANK" ? "bg-brand-600 text-white" : "text-zinc-600"}`}
          >
            Bank account
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            {destinationType === "GCASH" ? "GCash mobile number" : "Account number"}
            <input
              required
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder={destinationType === "GCASH" ? "09171234567" : "1234567890"}
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Account name
            <input
              required
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Juan Dela Cruz"
              className="input"
            />
          </label>
        </div>

        <div>
          <span className="text-sm font-medium text-zinc-700">
            {destinationType === "GCASH" ? "GCash institution code" : "Bank"}
          </span>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {institutions ? (
              <select
                value={bankCode}
                onChange={(e) => {
                  setBankCode(e.target.value);
                  setBankLabel(institutions.find((i) => i.code === e.target.value)?.label ?? "");
                }}
                className="input"
              >
                <option value="">Select…</option>
                {institutions.map((i) => (
                  <option key={i.code} value={i.code}>
                    {i.label}
                  </option>
                ))}
              </select>
            ) : bankLabel ? (
              <span className="text-sm text-zinc-600">{bankLabel} ({bankCode})</span>
            ) : (
              <span className="text-sm text-zinc-400">Not selected</span>
            )}
            <button
              type="button"
              onClick={loadInstitutions}
              disabled={!paymongoConfigured || loadingInstitutions}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
            >
              {loadingInstitutions ? "Loading…" : "Look up institutions"}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-700">Saved.</p>}

        <button
          type="submit"
          disabled={saving || !bankCode}
          className="self-start rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save payout destination"}
        </button>
      </form>
    </section>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${highlight ? "text-brand-600" : "text-zinc-900"}`}>
        {value}
      </p>
    </div>
  );
}
