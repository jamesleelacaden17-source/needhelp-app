import Link from "next/link";
import { PROVIDER_CATEGORIES } from "@/lib/config";

const CATEGORY_ICON: Record<string, string> = {
  CLEANING: "🧹",
  AIRCON: "❄️",
  LAUNDRY: "🧺",
};

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center bg-gradient-to-b from-brand-50 to-zinc-50 px-6">
      <div className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center gap-8 py-24 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-700 shadow-sm ring-1 ring-brand-100">
          <span aria-hidden="true">🛡️</span> ID &amp; photo-verified providers only
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          Whatever you need, <span className="text-brand-600">help is on the way.</span>
        </h1>
        <p className="max-w-xl text-lg text-zinc-600">
          NeedHelp instantly matches you with a nearby, verified cleaner, aircon technician,
          or laundry provider — anywhere in the Philippines. See exactly who&apos;s coming, track
          them live, and rate your experience.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/signup?role=CUSTOMER"
            className="rounded-full bg-brand-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Get help now
          </Link>
          <Link
            href="/signup?role=PROVIDER"
            className="rounded-full border border-brand-600 px-8 py-3 text-base font-semibold text-brand-700 hover:bg-brand-50"
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
            icon="🪪"
            title="Verified, with a face you can trust"
            body="Every provider passes government-ID review and uploads a real profile photo — so you always see exactly who's arriving."
          />
          <Feature
            icon="📍"
            title="Live tracking"
            body="See your provider's live location on the map and get their exact route to your door."
          />
          <Feature
            icon="🦸"
            title="Superhero-rated pros"
            body="Providers with a stellar rating and a strong track record earn a Superman or Superwoman badge — our top-performer title."
          />
        </div>
      </div>
    </main>
  );
}

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <span className="text-2xl">{icon}</span>
      <h3 className="mt-2 font-semibold text-zinc-900">{title}</h3>
      <p className="mt-1 text-sm text-zinc-600">{body}</p>
    </div>
  );
}
