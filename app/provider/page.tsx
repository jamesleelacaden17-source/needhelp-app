"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Booking, SessionUser } from "@/lib/types";
import { CURRENCY_SYMBOL, PROPERTY_TYPES, PROVIDER_CATEGORIES, getServiceByLabel } from "@/lib/config";
import LocationMap from "@/app/components/LocationMap";

const STATUS_LABEL: Record<string, string> = {
  ASSIGNED: "New job — ready to start",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  ASSIGNED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const PROPERTY_LABEL = Object.fromEntries(PROPERTY_TYPES.map((p) => [p.id, p.label]));

function bookingSubtitle(b: Booking) {
  if (b.propertyType) return PROPERTY_LABEL[b.propertyType] ?? b.propertyType;
  if (b.quantity != null) {
    const service = getServiceByLabel(b.serviceType);
    const unitLabel = service && service.pricingMode === "perUnit" ? service.unitLabel : "unit";
    return `${b.quantity} ${unitLabel}${b.quantity === 1 ? "" : "s"}`;
  }
  return `${b.hours ?? b.estimatedHours}h`;
}

function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export default function ProviderDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [locationSharing, setLocationSharing] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const [meRes, bookingsRes] = await Promise.all([
      fetch("/api/auth/me"),
      fetch("/api/bookings"),
    ]);
    const me = await meRes.json();
    if (!me.user || me.user.role !== "PROVIDER") {
      router.push("/login");
      return;
    }
    setUser(me.user);
    const data = await bookingsRes.json();
    setBookings(data.bookings);
  }, [router]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const interval = setInterval(loadAll, 4000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const hasActiveJob = bookings.some((b) => ["ASSIGNED", "IN_PROGRESS"].includes(b.status));
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!hasActiveJob || typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationSharing(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLocationSharing(true);
        setLocationError(null);
        const now = Date.now();
        if (now - lastSentRef.current < 5000) return;
        lastSentRef.current = now;
        fetch("/api/provider/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        }).catch(() => {});
      },
      (err) => {
        setLocationSharing(false);
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied — customers won't see your live location"
            : "Could not read your location"
        );
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [hasActiveJob]);

  async function toggleOnline() {
    setToggling(true);
    setToggleError(null);
    const res = await fetch("/api/provider/toggle-online", { method: "POST" });
    const data = await res.json();
    setToggling(false);
    if (!res.ok) {
      setToggleError(data.error ?? "Could not update status");
      return;
    }
    setUser((u) => (u ? { ...u, isOnline: data.isOnline } : u));
  }

  async function updateBooking(id: string, action: "start" | "complete" | "cancel") {
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    loadAll();
  }

  if (user === undefined) return null;

  const activeJobs = bookings.filter((b) => ["ASSIGNED", "IN_PROGRESS"].includes(b.status));
  const pastJobs = bookings.filter((b) => ["COMPLETED", "CANCELLED"].includes(b.status));
  const totalEarned = pastJobs.reduce(
    (sum, b) => sum + (b.transaction?.providerPayout ?? 0),
    0
  );

  const isVerified = user?.verificationStatus === "APPROVED";
  const categoryMeta = PROVIDER_CATEGORIES.find((c) => c.id === user?.providerCategory);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Hi {user?.name?.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {categoryMeta ? `${categoryMeta.providerLabel} · ` : ""}
            {user?.avgRating != null
              ? `★ ${user.avgRating.toFixed(1)} average rating`
              : "No ratings yet"}
            {" · "}Lifetime payout: {CURRENCY_SYMBOL}{totalEarned.toFixed(2)}
          </p>
        </div>
        <div className="text-right">
          <button
            onClick={toggleOnline}
            disabled={toggling || !isVerified}
            title={!isVerified ? "Complete ID verification to go online" : undefined}
            className={`rounded-full px-5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
              user?.isOnline
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
            }`}
          >
            {user?.isOnline ? "Online — receiving jobs" : "Offline — go online"}
          </button>
          {toggleError && <p className="mt-1 text-xs text-red-600">{toggleError}</p>}
        </div>
      </div>

      {user && !isVerified && (
        <VerificationPanel user={user} onUpdated={loadAll} />
      )}

      {hasActiveJob && (
        <p className="mt-3 text-xs text-zinc-500">
          {locationSharing
            ? "📍 Sharing your live location with the customer"
            : locationError ?? "Requesting location access to share with the customer…"}
        </p>
      )}

      <section className="mt-8">
        <h2 className="font-semibold text-zinc-900">Active jobs</h2>
        {activeJobs.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            No active jobs. {user?.isOnline ? "Waiting for a booking…" : "Go online to start receiving jobs."}
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {activeJobs.map((b) => (
              <div key={b.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-900">{b.serviceType}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[b.status]}`}>
                    {STATUS_LABEL[b.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">{b.address}</p>
                <p className="mt-1 text-sm text-zinc-500">Customer: {b.customer?.name}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {bookingSubtitle(b)}
                </p>
                {b.notes && <p className="mt-1 text-sm text-zinc-500">Notes: {b.notes}</p>}

                <div className="mt-3">
                  <LocationMap
                    center={[b.customerLat, b.customerLng]}
                    markers={[
                      { id: "house", lat: b.customerLat, lng: b.customerLng, color: "teal", label: "Customer" },
                    ]}
                  />
                  <a
                    href={directionsUrl(b.customerLat, b.customerLng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-xs font-medium text-teal-700 hover:underline"
                  >
                    Get directions →
                  </a>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-900">
                    {CURRENCY_SYMBOL}{b.price.toFixed(2)}
                  </span>
                  <div className="flex gap-2">
                    {b.status === "ASSIGNED" && (
                      <button
                        onClick={() => updateBooking(b.id, "start")}
                        className="rounded-full bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-700"
                      >
                        Start job
                      </button>
                    )}
                    {b.status === "IN_PROGRESS" && (
                      <button
                        onClick={() => updateBooking(b.id, "complete")}
                        className="rounded-full bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-700"
                      >
                        Mark complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {pastJobs.length > 0 && (
        <section className="mt-8">
          <h2 className="font-semibold text-zinc-900">History</h2>
          <div className="mt-3 flex flex-col gap-3">
            {pastJobs.map((b) => (
              <div key={b.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-900">{b.serviceType}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[b.status]}`}>
                    {STATUS_LABEL[b.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">{b.address}</p>
                {b.transaction && (
                  <p className="mt-1 text-sm text-zinc-500">
                    Job total {CURRENCY_SYMBOL}{b.transaction.amount.toFixed(2)} · platform fee{" "}
                    {CURRENCY_SYMBOL}{b.transaction.commissionAmount.toFixed(2)} · you earned{" "}
                    <span className="font-semibold text-zinc-900">
                      {CURRENCY_SYMBOL}{b.transaction.providerPayout.toFixed(2)}
                    </span>
                  </p>
                )}
                {b.rating && (
                  <p className="mt-1 text-sm text-amber-600">
                    {"★".repeat(b.rating.stars)}
                    {"☆".repeat(5 - b.rating.stars)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function VerificationPanel({
  user,
  onUpdated,
}: {
  user: SessionUser;
  onUpdated: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = user.verificationStatus ?? "UNSUBMITTED";

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("photo", file);
    const res = await fetch("/api/provider/id-photo", {
      method: "POST",
      body: formData,
    });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Upload failed");
      return;
    }
    setFile(null);
    onUpdated();
  }

  if (status === "PENDING") {
    return (
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-800">ID verification pending review</p>
        <p className="mt-1 text-sm text-amber-700">
          We&apos;re reviewing your submitted ID. You&apos;ll be able to go online once it&apos;s approved.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-800">
        {status === "REJECTED" ? "ID verification rejected" : "ID verification required"}
      </p>
      <p className="mt-1 text-sm text-amber-700">
        For customer safety, upload a photo of a valid government ID before you can accept jobs.
      </p>
      {status === "REJECTED" && user.rejectionReason && (
        <p className="mt-1 text-sm text-red-700">Reason: {user.rejectionReason}</p>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-zinc-700"
        />
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="rounded-full bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "Submit ID"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
