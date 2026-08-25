"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/reward";

  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    const res = await fetch("/api/reward-login", {
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
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 font-heading text-sm font-black text-kosei-800">
        渦潮祭
      </h1>
      <p className="mb-6 text-xs text-kosei-600">特別企画スタッフ用</p>

      <form onSubmit={handleSubmit}>
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-bold text-kosei-600">
            パスワード
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="w-full rounded-xl border-2 border-kosei-700 bg-white p-3 text-base"
          />
        </label>
        {error && (
          <p className="mb-3 text-xs font-bold text-danger-800">
            パスワードが違います
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="pressable w-full rounded-xl border-2 border-kosei-800 bg-kosei-600 p-3 font-heading text-base font-black text-white shadow-[0_4px_0_var(--color-kosei-800)] disabled:opacity-50"
        >
          {submitting ? "確認中..." : "ログイン"}
        </button>
      </form>
    </div>
  );
}

export default function RewardLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
