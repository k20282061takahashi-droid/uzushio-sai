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
      <h1 className="mb-1 text-sm font-bold text-slate-300">渦潮祭</h1>
      <p className="mb-6 text-xs text-slate-500">運営用</p>

      <form onSubmit={handleSubmit}>
        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-slate-400">パスワード</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-white/10 bg-slate-900 p-3 text-sm"
          />
        </label>
        {error && (
          <p className="mb-3 text-xs text-red-400">パスワードが違います</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-white/10 p-3 text-sm font-semibold active:scale-95 disabled:opacity-50"
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
