type IconProps = { className?: string };

export function BroomIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M20 4 10.5 13.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M11 13 4 20c-.6-2.5 0-4.8 1.8-6.6C7 12.2 8.6 11.6 10 12l1 1Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="m17 7 2.5-2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="19.5" cy="4.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function SnowflakeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M12 3v18" />
        <path d="M4.5 7.5l15 9" />
        <path d="M19.5 7.5l-15 9" />
        <path d="M9 4.5 12 7l3-2.5" />
        <path d="M9 19.5 12 17l3 2.5" />
      </g>
    </svg>
  );
}

export function BasketIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 10h16l-1.6 8.2a2 2 0 0 1-2 1.8H7.6a2 2 0 0 1-2-1.8L4 10Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 13.5v4M12 13.5v4M15 13.5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IdCardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="8.5" cy="11" r="1.9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.7 16c.5-1.6 1.7-2.4 2.8-2.4s2.3.8 2.8 2.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M14.5 9.5h4M14.5 12.5h4M14.5 15.5h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function PinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function CapeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3.2 15 6l3.5 12.5c-2.1-1.4-4.2-1.4-6.5-.4-2.3-1-4.4-1-6.5.4L9 6l3-2.8Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path d="M9 6h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="12" cy="6" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function ShieldCheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3.5 19 6v6c0 5-3 8.2-7 9.5-4-1.3-7-4.5-7-9.5V6l7-2.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="m9 12 2 2 4-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CoinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.5v9M9.3 14.3c0 1 1.1 1.8 2.7 1.8s2.7-.7 2.7-1.7c0-2.6-5.4-1.3-5.4-3.8 0-1 1.1-1.7 2.7-1.7s2.5.7 2.7 1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
