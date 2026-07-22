"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Booking, SessionUser } from "@/lib/types";
import {
  SERVICE_TYPES,
  PROPERTY_TYPES,
  PROVIDER_CATEGORIES,
  CURRENCY_SYMBOL,
  calculateBookingPrice,
  servicesForCategory,
  getServiceByLabel,
  formatScheduledTime,
  DEFAULT_MAP_CENTER,
  MIN_HOURS,
  MAX_HOURS,
  type ProviderCategoryId,
} from "@/lib/config";
import LocationMap from "@/app/components/LocationMap";
import { VerifiedBadge, SuperBadge, ProviderAvatar } from "@/app/components/Badges";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Waiting for a provider to accept",
  ASSIGNED: "Provider on the way",
  IN_PROGRESS: "Job in progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_PROVIDERS_AVAILABLE: "No providers available right now",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  NO_PROVIDERS_AVAILABLE: "bg-red-100 text-red-700",
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

export default function CustomerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [category, setCategory] = useState<ProviderCategoryId>(PROVIDER_CATEGORIES[0].id);
  const categoryServices = useMemo(() => servicesForCategory(category), [category]);
  const [serviceType, setServiceType] = useState<string>(categoryServices[0].id);
  const [propertyType, setPropertyType] = useState<(typeof PROPERTY_TYPES)[number]["id"]>(
    PROPERTY_TYPES[0].id
  );
  const [hours, setHours] = useState(2);
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState("");
  const [pin, setPin] = useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [notes, setNotes] = useState("");
  const [arrivalMode, setArrivalMode] = useState<"asap" | "scheduled">("asap");
  const [scheduledFor, setScheduledFor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minScheduleValue = useMemo(() => {
    const d = new Date(Date.now() + 20 * 60 * 1000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }, []);

  const loadBookings = useCallback(async () => {
    const res = await fetch("/api/bookings");
    if (res.ok) {
      const data = await res.json();
      setBookings(data.bookings);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user || d.user.role !== "CUSTOMER") {
          router.push("/login");
          return;
        }
        setUser(d.user);
      });
    loadBookings();
  }, [router, loadBookings]);

  useEffect(() => {
    const activeExists = bookings.some((b) =>
      ["PENDING", "ASSIGNED", "IN_PROGRESS"].includes(b.status)
    );
    if (!activeExists) return;
    const interval = setInterval(loadBookings, 4000);
    return () => clearInterval(interval);
  }, [bookings, loadBookings]);

  function handleCategoryChange(next: ProviderCategoryId) {
    setCategory(next);
    const services = servicesForCategory(next);
    setServiceType(services[0].id);
    setQuantity(services[0].pricingMode === "perUnit" ? services[0].minUnits : 1);
  }

  const selectedService = SERVICE_TYPES.find((s) => s.id === serviceType) ?? categoryServices[0];

  function handleServiceChange(id: string) {
    setServiceType(id);
    const service = SERVICE_TYPES.find((s) => s.id === id);
    if (service?.pricingMode === "perUnit") setQuantity(service.minUnits);
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceType,
        address,
        customerLat: pin[0],
        customerLng: pin[1],
        propertyType: selectedService.pricingMode === "tieredFlat" ? propertyType : undefined,
        hours: selectedService.pricingMode === "hourly" ? Number(hours) : undefined,
        quantity: selectedService.pricingMode === "perUnit" ? Number(quantity) : undefined,
        notes,
        scheduledFor:
          arrivalMode === "scheduled" && scheduledFor
            ? new Date(scheduledFor).toISOString()
            : undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not create booking");
      return;
    }
    setAddress("");
    setNotes("");
    setArrivalMode("asap");
    setScheduledFor("");
    await loadBookings();
  }

  async function cancelBooking(id: string) {
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    loadBookings();
  }

  if (user === undefined) return null;

  const activeBookings = bookings.filter((b) =>
    ["PENDING", "ASSIGNED", "IN_PROGRESS", "NO_PROVIDERS_AVAILABLE"].includes(b.status)
  );
  const pastBookings = bookings.filter((b) =>
    ["COMPLETED", "CANCELLED"].includes(b.status)
  );

  const quote = calculateBookingPrice(serviceType, { propertyType, hours, quantity });
  const estimate = quote?.price ?? 0;
  const estimatedHours = quote?.estimatedHours ?? 0;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-ink-950">Hi {user?.name?.split(" ")[0]} 👋</h1>
      <p className="mt-1 text-sm text-zinc-500">Book help instantly, or check on an active job.</p>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-zinc-900">Book now</h2>
        <form onSubmit={handleBook} className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {PROVIDER_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCategoryChange(c.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  category === c.id
                    ? "bg-brand-600 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Service type
            <select
              value={serviceType}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="input"
            >
              {categoryServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          {selectedService.pricingMode === "tieredFlat" && (
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              Property type
              <select
                value={propertyType}
                onChange={(e) =>
                  setPropertyType(e.target.value as (typeof PROPERTY_TYPES)[number]["id"])
                }
                className="input"
              >
                {PROPERTY_TYPES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} ({CURRENCY_SYMBOL}{p.price} flat)
                  </option>
                ))}
              </select>
            </label>
          )}

          {selectedService.pricingMode === "hourly" && (
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              Hours ({CURRENCY_SYMBOL}{selectedService.ratePerHour}/hr)
              <input
                type="number"
                min={MIN_HOURS}
                max={MAX_HOURS}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="input"
              />
            </label>
          )}

          {selectedService.pricingMode === "perUnit" && (
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              Number of {selectedService.unitLabel}s ({CURRENCY_SYMBOL}
              {selectedService.pricePerUnit}/{selectedService.unitLabel})
              <input
                type="number"
                min={selectedService.minUnits}
                max={selectedService.maxUnits}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="input"
              />
            </label>
          )}

          {selectedService.pricingMode === "flat" && (
            <div className="rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              Fixed price for this service — no extra details needed.
            </div>
          )}

          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Address
            <input
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Quezon Ave, Barangay I, Vigan City, Ilocos Sur"
              className="input"
            />
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-700">
              Pin your exact location (tap the map)
            </span>
            <LocationMap
              center={pin}
              markers={[{ id: "pin", lat: pin[0], lng: pin[1], color: "brand" }]}
              onPick={(lat, lng) => setPin([lat, lng])}
            />
            <span className="text-xs text-zinc-400">
              {pin[0].toFixed(5)}, {pin[1].toFixed(5)}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-700">When do you need this?</span>
            <div className="flex rounded-full border border-zinc-300 bg-zinc-50 p-1 text-sm font-medium w-fit">
              <button
                type="button"
                onClick={() => setArrivalMode("asap")}
                className={`rounded-full px-4 py-1.5 ${arrivalMode === "asap" ? "bg-brand-600 text-white" : "text-zinc-600"}`}
              >
                As soon as possible
              </button>
              <button
                type="button"
                onClick={() => setArrivalMode("scheduled")}
                className={`rounded-full px-4 py-1.5 ${arrivalMode === "scheduled" ? "bg-brand-600 text-white" : "text-zinc-600"}`}
              >
                Schedule for later
              </button>
            </div>
            {arrivalMode === "scheduled" && (
              <input
                type="datetime-local"
                required
                min={minScheduleValue}
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="input w-fit"
              />
            )}
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Notes (optional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input"
              rows={2}
              placeholder="Gate code, pets, special instructions…"
            />
          </label>

          <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-3 text-sm">
            <span className="text-zinc-600">
              {selectedService.pricingMode === "tieredFlat" || selectedService.pricingMode === "flat"
                ? "Flat rate"
                : "Estimated price"}{" "}
              · ~{estimatedHours}h
            </span>
            <span className="font-semibold text-zinc-900">{CURRENCY_SYMBOL}{estimate.toFixed(2)}</span>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? "Finding a provider…" : "Book instantly"}
          </button>
        </form>
      </section>

      {activeBookings.length > 0 && (
        <section className="mt-8">
          <h2 className="font-semibold text-zinc-900">Active</h2>
          <div className="mt-3 flex flex-col gap-3">
            {activeBookings.map((b) => (
              <ActiveBookingCard key={b.id} booking={b} onCancel={cancelBooking} />
            ))}
          </div>
        </section>
      )}

      {pastBookings.length > 0 && (
        <section className="mt-8">
          <h2 className="font-semibold text-zinc-900">History</h2>
          <div className="mt-3 flex flex-col gap-3">
            {pastBookings.map((b) => (
              <PastBookingCard key={b.id} booking={b} onRated={loadBookings} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function ActiveBookingCard({
  booking: b,
  onCancel,
}: {
  booking: Booking;
  onCancel: (id: string) => void;
}) {
  const hasProviderLocation = b.provider?.lastLat != null && b.provider?.lastLng != null;
  const showMap = ["ASSIGNED", "IN_PROGRESS"].includes(b.status);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-zinc-900">{b.serviceType}</span>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[b.status]}`}>
          {STATUS_LABEL[b.status]}
        </span>
      </div>
      <p className="mt-1 text-sm text-zinc-500">{b.address}</p>
      <p className="mt-1 text-sm text-zinc-500">{bookingSubtitle(b)}</p>
      <p className="mt-1 text-sm text-zinc-500">🕐 {formatScheduledTime(b.scheduledFor)}</p>

      {b.status !== "PENDING" && b.provider ? (
        <div className="mt-2 flex items-center gap-2">
          <ProviderAvatar
            providerId={b.provider.id}
            name={b.provider.name}
            hasPhoto={!!b.provider.profilePhotoPath}
            size={36}
          />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-zinc-900">{b.provider.name}</span>
            <div className="flex flex-wrap items-center gap-1">
              {b.provider.verificationStatus === "APPROVED" && <VerifiedBadge />}
              {b.provider.superBadge && <SuperBadge label={b.provider.superBadge} />}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-1 text-sm text-zinc-500">
          {b.providerId ? "Waiting for a nearby provider to accept your request…" : "Searching for a provider…"}
        </p>
      )}

      {showMap && (
        <div className="mt-3">
          <LocationMap
            center={[b.customerLat, b.customerLng]}
            markers={[
              { id: "house", lat: b.customerLat, lng: b.customerLng, color: "brand", label: "Your address" },
              ...(hasProviderLocation
                ? [
                    {
                      id: "provider",
                      lat: b.provider!.lastLat as number,
                      lng: b.provider!.lastLng as number,
                      color: "blue" as const,
                      label: b.provider!.name,
                    },
                  ]
                : []),
            ]}
          />
          <p className="mt-1 text-xs text-zinc-400">
            {hasProviderLocation
              ? "Provider's live location — updates automatically"
              : "Waiting for provider to share their location…"}
          </p>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-900">{CURRENCY_SYMBOL}{b.price.toFixed(2)}</span>
        {["PENDING", "ASSIGNED", "NO_PROVIDERS_AVAILABLE"].includes(b.status) && (
          <button
            onClick={() => onCancel(b.id)}
            className="text-sm font-medium text-red-600 hover:underline"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function PastBookingCard({ booking, onRated }: { booking: Booking; onRated: () => void }) {
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitRating() {
    setSubmitting(true);
    await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: booking.id, stars, comment }),
    });
    setSubmitting(false);
    onRated();
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-zinc-900">{booking.serviceType}</span>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[booking.status]}`}>
          {STATUS_LABEL[booking.status]}
        </span>
      </div>
      <p className="mt-1 text-sm text-zinc-500">{booking.address}</p>
      <p className="mt-1 text-sm text-zinc-500">{bookingSubtitle(booking)}</p>
      {booking.provider && (
        <div className="mt-2 flex items-center gap-2">
          <ProviderAvatar
            providerId={booking.provider.id}
            name={booking.provider.name}
            hasPhoto={!!booking.provider.profilePhotoPath}
            size={28}
          />
          <span className="text-sm text-zinc-700">{booking.provider.name}</span>
          {booking.provider.verificationStatus === "APPROVED" && <VerifiedBadge />}
          {booking.provider.superBadge && <SuperBadge label={booking.provider.superBadge} />}
        </div>
      )}
      <p className="mt-1 text-sm font-semibold text-zinc-900">{CURRENCY_SYMBOL}{booking.price.toFixed(2)}</p>

      {booking.status === "COMPLETED" && <PaymentSection booking={booking} />}

      {booking.status === "COMPLETED" && (
        booking.rating ? (
          <p className="mt-3 text-sm text-amber-600">
            {"★".repeat(booking.rating.stars)}
            {"☆".repeat(5 - booking.rating.stars)}
            {booking.rating.comment && (
              <span className="ml-2 text-zinc-500">“{booking.rating.comment}”</span>
            )}
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2 rounded-lg bg-zinc-50 p-3">
            <span className="text-sm font-medium text-zinc-700">Rate your provider</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setStars(n)}
                  className={`text-2xl leading-none ${n <= stars ? "text-amber-500" : "text-zinc-300"}`}
                  aria-label={`${n} stars`}
                >
                  ★
                </button>
              ))}
            </div>
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Leave a comment (optional)"
              className="input"
            />
            <button
              onClick={submitRating}
              disabled={submitting}
              className="self-start rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit rating"}
            </button>
          </div>
        )
      )}
    </div>
  );
}

function PaymentSection({ booking }: { booking: Booking }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function payNow() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: booking.id }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not start payment");
      return;
    }
    window.location.href = data.checkoutUrl;
  }

  if (booking.paymentStatus === "PAID") {
    return <p className="mt-1 text-sm font-medium text-green-700">✓ Paid</p>;
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      {booking.paymentStatus === "PENDING" && booking.paymongoCheckoutUrl ? (
        <a
          href={booking.paymongoCheckoutUrl}
          className="rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Continue payment
        </a>
      ) : (
        <button
          onClick={payNow}
          disabled={loading}
          className="rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Starting payment…" : booking.paymentStatus === "FAILED" ? "Retry payment" : "Pay now"}
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
