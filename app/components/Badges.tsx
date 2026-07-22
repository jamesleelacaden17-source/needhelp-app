export function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 1.5 12 3l2.7.3 1.1 2.5L18 7.5 17 10l1 2.5-2.2 1.7-1.1 2.5L12 17l-2 1.5-2-1.5-2.7-.3-1.1-2.5L2 12.5 3 10 2 7.5l2.2-1.7 1.1-2.5L8 3l2-1.5Zm3.36 6.65a.75.75 0 0 0-1.12-.99l-3.02 3.4-1.46-1.46a.75.75 0 1 0-1.06 1.06l2.04 2.04a.75.75 0 0 0 1.09-.04l3.53-3.99Z"
          clipRule="evenodd"
        />
      </svg>
      Verified
    </span>
  );
}

export function SuperBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-2 py-0.5 text-xs font-semibold text-amber-950 shadow-sm">
      <span aria-hidden="true">🦸</span>
      {label}
    </span>
  );
}

export function ProviderAvatar({
  providerId,
  name,
  hasPhoto,
  size = 40,
}: {
  providerId: string;
  name: string;
  hasPhoto?: boolean;
  size?: number;
}) {
  if (!hasPhoto) {
    return (
      <span
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        className="flex shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-brand-100 font-semibold text-brand-700"
      >
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/uploads/profile-photo/${providerId}`}
      alt={name}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full border border-zinc-200 bg-zinc-100 object-cover"
    />
  );
}
