"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/organizer";

  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    const res = await fetch("/api/organizer-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setSubmitting(false);
    if (res.ok) {
      router.push(next);
      router.refresh();
    } else {
      setError(true);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 text-white">
      <h1 className="text-[15px] font-medium tracking-[0.08em] text-neutral-100">
        渦潮祭
      </h1>
      <p className="mb-7 text-[12px] tracking-[0.14em] text-neutral-500">
        ORGANIZER
      </p>

      <form onSubmit={handleSubmit}>
        <label className="mb-3 block">
          <span className="mb-1.5 block text-xs tracking-[0.04em] text-neutral-400">
            パスワード
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="w-full rounded-md border border-white/15 bg-transparent p-3 text-sm text-neutral-100 placeholder:text-neutral-600"
          />
        </label>
        {error && (
          <p className="mb-3 text-xs text-red-400">パスワードが違います</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-white p-3 text-sm font-medium text-neutral-950 transition-opacity hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
        >
          {submitting ? "確認中..." : "ログイン"}
        </button>
      </form>
    </div>
  );
}

export default function OrganizerLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
