"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/types";

export default function Nav() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  const dashboardHref =
    user?.role === "CUSTOMER"
      ? "/customer"
      : user?.role === "PROVIDER"
        ? "/provider"
        : user?.role === "ADMIN"
          ? "/admin"
          : "/";

  return (
    <nav className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-base font-bold tracking-tight text-zinc-900 sm:text-lg"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm sm:h-8 sm:w-8">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 sm:h-4.5 sm:w-4.5" aria-hidden="true">
              <path
                d="M12 3.5c-3.5 3-7 6.2-7 10.2a7 7 0 0 0 14 0c0-4-3.5-7.2-7-10.2Z"
                fill="currentColor"
              />
              <path
                d="m9 13 2 2 4-4.5"
                stroke="var(--color-brand-700)"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          NeedHelp
        </Link>
        <div className="flex min-w-0 items-center gap-2 text-sm sm:gap-4">
          {user === undefined ? null : user ? (
            <>
              <Link
                href={dashboardHref}
                className="whitespace-nowrap font-medium text-zinc-700 hover:text-brand-700"
              >
                Dashboard
              </Link>
              <span className="hidden max-w-[10rem] truncate text-zinc-400 sm:inline">{user.name}</span>
              <button
                onClick={handleLogout}
                className="shrink-0 whitespace-nowrap rounded-full border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100 sm:px-4"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="whitespace-nowrap font-medium text-zinc-700 hover:text-brand-700">
                Log in
              </Link>
              <Link
                href="/signup"
                className="shrink-0 whitespace-nowrap rounded-full bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700 sm:px-4"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
