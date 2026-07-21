import Link from "next/link";
import { PROVIDER_CATEGORIES } from "@/lib/config";

const CATEGORY_ICON: Record<string, string> = {
  CLEANING: "🧹",
  AIRCON: "❄️",
  LAUNDRY: "🧺",
};

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center bg-gradient-to-b from-teal-50 to-zinc-50 px-6">
      <div className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center gap-8 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          Whatever you need, <span className="text-teal-600">help is on the way.</span>
        </h1>
        <p className="max-w-xl text-lg text-zinc-600">
          NeedHelp instantly matches you with a nearby, verified cleaner, aircon technician,
          or laundry provider — anywhere in the Philippines. Book in seconds, track
          your job live, and rate your experience.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/signup?role=CUSTOMER"
            className="rounded-full bg-teal-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-teal-700"
          >
            Get help now
          </Link>
          <Link
            href="/signup?role=PROVIDER"
            className="rounded-full border border-teal-600 px-8 py-3 text-base font-semibold text-teal-700 hover:bg-teal-50"
          >
            Become a provider
          </Link>
        </div>

        <div className="mt-8 grid w-full grid-cols-3 gap-4">
          {PROVIDER_CATEGORIES.map((c) => (
            <div
              key={c.id}
              className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <span className="text-3xl">{CATEGORY_ICON[c.id]}</span>
              <span className="text-sm font-medium text-zinc-900">{c.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 grid w-full grid-cols-1 gap-6 text-left sm:grid-cols-3">
          <Feature
            title="Instant matching"
            body="We auto-assign the best available, highest-rated, ID-verified provider near you the moment you book."
          />
          <Feature
            title="Live tracking"
            body="See your provider's live location on the map and get their exact route to your door."
          />
          <Feature
            title="Transparent commission"
            body="NeedHelp takes a flat platform fee on every completed job — providers see their exact payout."
          />
        </div>
      </div>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-zinc-900">{title}</h3>
      <p className="mt-1 text-sm text-zinc-600">{body}</p>
    </div>
  );
}
