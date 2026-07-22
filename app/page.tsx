import Link from "next/link";
import { PROVIDER_CATEGORIES } from "@/lib/config";
import { BroomIcon, SnowflakeIcon, BasketIcon, IdCardIcon, PinIcon, CapeIcon, ShieldCheckIcon, CoinIcon } from "@/app/components/Icons";

const CATEGORY_ICON: Record<string, (props: { className?: string }) => React.ReactElement> = {
  CLEANING: BroomIcon,
  AIRCON: SnowflakeIcon,
  LAUNDRY: BasketIcon,
};

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="relative flex flex-col items-center overflow-hidden bg-gradient-to-b from-brand-50 to-zinc-50 px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl sm:h-96 sm:w-96"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-40 -left-32 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl sm:h-96 sm:w-96"
        />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-8 py-20 text-center sm:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-700 shadow-sm ring-1 ring-brand-100">
            <ShieldCheckIcon className="h-3.5 w-3.5" /> ID &amp; photo-verified providers only
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-ink-950 sm:text-5xl">
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
              className="rounded-full bg-brand-600 px-8 py-3 text-base font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/20"
            >
              Get help now
            </Link>
            <Link
              href="/signup?role=PROVIDER"
              className="rounded-full border border-brand-600 px-8 py-3 text-base font-semibold text-brand-700 transition-all hover:-translate-y-0.5 hover:bg-brand-50 hover:shadow-md"
            >
              Become a provider
            </Link>
          </div>

          <div className="mt-8 grid w-full grid-cols-3 gap-4">
            {PROVIDER_CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICON[c.id];
              return (
                <div
                  key={c.id}
                  className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="text-sm font-medium text-zinc-900">{c.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-ink-950">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 px-6 py-14 text-center sm:grid-cols-3">
          <TrustStat
            icon={ShieldCheckIcon}
            title="ID + Photo Verified"
            body="Every provider clears a government-ID review and uploads a real face photo before going online."
          />
          <TrustStat
            icon={PinIcon}
            title="Live GPS Tracking"
            body="Know exactly where your provider is and when they'll arrive, in real time."
          />
          <TrustStat
            icon={CoinIcon}
            title="Transparent Pricing"
            body="Market-rate pricing shown upfront — no hidden fees, no surprises at the end."
          />
        </div>
      </div>

      <div className="bg-zinc-50 px-6 py-16">
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
          <Feature
            icon={IdCardIcon}
            title="Verified, with a face you can trust"
            body="Every provider passes government-ID review and uploads a real profile photo — so you always see exactly who's arriving."
          />
          <Feature
            icon={PinIcon}
            title="Live tracking"
            body="See your provider's live location on the map and get their exact route to your door."
          />
          <Feature
            icon={CapeIcon}
            title="Superhero-rated pros"
            body="Providers with a stellar rating and a strong track record earn a Superman or Superwoman badge — our top-performer title."
          />
        </div>
      </div>
    </main>
  );
}

function TrustStat({
  icon: Icon,
  title,
  body,
}: {
  icon: (props: { className?: string }) => React.ReactElement;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/15 text-brand-300">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="font-[family-name:var(--font-display)] font-bold text-white">{title}</h3>
      <p className="text-sm text-zinc-400">{body}</p>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: (props: { className?: string }) => React.ReactElement;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-3 font-semibold text-zinc-900">{title}</h3>
      <p className="mt-1 text-sm text-zinc-600">{body}</p>
    </div>
  );
}
