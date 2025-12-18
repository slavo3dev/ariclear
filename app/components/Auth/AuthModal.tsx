"use client";

import { useMemo, useState } from "react";
import { supabaseAriClear } from "@ariclear/lib";
import { Button } from "@ariclear/components";

type Mode = "login" | "signup";

export function AuthModal({
  open,
  onClose,
  initialMode = "login",
}: {
  open: boolean;
  onClose: () => void;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(
    () => (mode === "login" ? "Log in to AriClear" : "Create your AriClear account"),
    [mode],
  );

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabaseAriClear.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
      } else {
        const { error } = await supabaseAriClear.auth.signUp({ email, password });
        if (error) throw error;
        onClose();
      }
       
      // TODO: handle post-signup actions (e.g., email verification)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err?.message ?? "Auth error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-2xl bg-choco-900 p-6 shadow-xl ring-1 ring-choco-700">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-choco-300">
              Secure access
            </p>
            <h2 className="mt-1 text-xl font-semibold text-cream-50">{title}</h2>
            <p className="mt-1 text-xs text-choco-200">
              Access the demo and save scans to your account.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-choco-200 hover:bg-choco-800"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-choco-300">
              Email
            </label>
            <input
              className="w-full rounded-full border border-choco-700 bg-choco-800 px-4 py-2 text-sm text-cream-50 placeholder:text-choco-400 focus:border-choco-400 focus:outline-none focus:ring-1 focus:ring-choco-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="you@startup.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.12em] text-choco-300">
              Password
            </label>
            <input
              className="w-full rounded-full border border-choco-700 bg-choco-800 px-4 py-2 text-sm text-cream-50 placeholder:text-choco-400 focus:border-choco-400 focus:outline-none focus:ring-1 focus:ring-choco-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
            />
            <p className="text-[11px] text-choco-300">Min 6 characters.</p>
          </div>

          {error ? (
            <p className="rounded-xl bg-choco-800 px-3 py-2 text-[12px] text-cream-100">
              ⚠️ {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full justify-center" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </Button>

          <div className="flex items-center justify-between text-xs text-choco-200">
            <span>
              {mode === "login" ? "No account yet?" : "Already have an account?"}
            </span>
            <button
              type="button"
              className="underline-offset-2 hover:underline"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
