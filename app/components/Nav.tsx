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
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-teal-700">
          NeedHelp
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {user === undefined ? null : user ? (
            <>
              <Link href={dashboardHref} className="font-medium text-zinc-700 hover:text-teal-700">
                Dashboard
              </Link>
              <span className="text-zinc-400">{user.name}</span>
              <button
                onClick={handleLogout}
                className="rounded-full border border-zinc-300 px-4 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="font-medium text-zinc-700 hover:text-teal-700">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-teal-600 px-4 py-1.5 font-medium text-white hover:bg-teal-700"
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
