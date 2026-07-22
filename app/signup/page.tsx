"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PROVIDER_CATEGORIES, type ProviderCategoryId, type Gender } from "@/lib/config";

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialRole = params.get("role") === "PROVIDER" ? "PROVIDER" : "CUSTOMER";
  const initialCategory = (params.get("category") as ProviderCategoryId | null) ?? PROVIDER_CATEGORIES[0].id;

  const [role, setRole] = useState<"CUSTOMER" | "PROVIDER">(initialRole);
  const [providerCategory, setProviderCategory] = useState<ProviderCategoryId>(initialCategory);
  const [gender, setGender] = useState<Gender | "">("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        role,
        providerCategory: role === "PROVIDER" ? providerCategory : undefined,
        gender: role === "PROVIDER" && gender ? gender : undefined,
        phone,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      return;
    }
    router.push(role === "CUSTOMER" ? "/customer" : "/provider");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-bold text-zinc-900">Create your account</h1>
      <p className="mt-1 text-sm text-zinc-500">Join NeedHelp as a customer or service provider.</p>

      <div className="mt-6 flex rounded-full border border-zinc-300 bg-white p-1 text-sm font-medium">
        <button
          type="button"
          onClick={() => setRole("CUSTOMER")}
          className={`flex-1 rounded-full py-2 ${role === "CUSTOMER" ? "bg-brand-600 text-white" : "text-zinc-600"}`}
        >
          I need help
        </button>
        <button
          type="button"
          onClick={() => setRole("PROVIDER")}
          className={`flex-1 rounded-full py-2 ${role === "PROVIDER" ? "bg-brand-600 text-white" : "text-zinc-600"}`}
        >
          I provide a service
        </button>
      </div>

      {role === "PROVIDER" && (
        <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Service category
          <select
            value={providerCategory}
            onChange={(e) => setProviderCategory(e.target.value as ProviderCategoryId)}
            className="input"
          >
            {PROVIDER_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.providerLabel})
              </option>
            ))}
          </select>
        </label>
      )}

      {role === "PROVIDER" && (
        <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-zinc-700">
          Gender (optional)
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender | "")}
            className="input"
          >
            <option value="">Prefer not to say</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
          <span className="text-xs font-normal text-zinc-400">
            Used to personalize your top-performer badge (Superman / Superwoman).
          </span>
        </label>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Field label="Full name">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Jane Doe"
          />
        </Field>
        <Field label="Email">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="jane@example.com"
          />
        </Field>
        <Field label="Phone (optional)">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input"
            placeholder="+63 917 000 0000"
          />
        </Field>
        <Field label="Password">
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="At least 6 characters"
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-700">
          Log in
        </Link>
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
      {label}
      {children}
    </label>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
